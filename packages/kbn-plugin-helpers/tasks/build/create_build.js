/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const path = require('path');
const relative = require('path').relative;
const { readFileSync, writeFileSync, unlinkSync, existsSync } = require('fs');
const execa = require('execa');
const sass = require('node-sass');
const del = require('del');
const vfs = require('vinyl-fs');
const rename = require('gulp-rename');
const through = require('through2');
const minimatch = require('minimatch');
const gulpBabel = require('gulp-babel');
const { promisify } = require('util');
const { pipeline } = require('stream');

const rewritePackageJson = require('./rewrite_package_json');
const winCmd = require('../../lib/win_cmd');

const asyncPipeline = promisify(pipeline);

// `link:` dependencies create symlinks, but we don't want to include symlinks
// in the built zip file. Therefore we remove all symlinked dependencies, so we
// can re-create them when installing the plugin.
function removeSymlinkDependencies(root) {
  const nodeModulesPattern = path.join(root, '**', 'node_modules', '**');

  return through.obj((file, enc, cb) => {
    const isSymlink = file.symlink != null;
    const isDependency = minimatch(file.path, nodeModulesPattern);

    if (isSymlink && isDependency) {
      unlinkSync(file.path);
    }

    cb();
  });
}

// parse a ts config file
function parseTsconfig(pluginSourcePath, configPath) {
  const ts = require(path.join(pluginSourcePath, 'node_modules', 'typescript')); // eslint-disable-line import/no-dynamic-require

  const { error, config } = ts.parseConfigFileTextToJson(
    configPath,
    readFileSync(configPath, 'utf8')
  );

  if (error) {
    throw error;
  }

  return config;
}

// transpile with babel
async function transpileWithBabel(srcGlobs, buildRoot, presets) {
  await asyncPipeline(
    vfs.src(
      srcGlobs.concat([
        '!**/*.d.ts',
        '!**/*.{test,test.mocks,mock,mocks}.{ts,tsx}',
        '!**/node_modules/**',
        '!**/bower_components/**',
        '!**/__tests__/**',
      ]),
      {
        cwd: buildRoot,
      }
    ),

    gulpBabel({
      babelrc: false,
      presets,
    }),

    vfs.dest(buildRoot)
  );
}

module.exports = function createBuild(plugin, buildTarget, buildVersion, kibanaVersion, files) {
  const buildSource = plugin.root;
  const buildRoot = path.join(buildTarget, 'kibana', plugin.id);

  return del(buildTarget)
    .then(function() {
      return new Promise(function(resolve, reject) {
        vfs
          .src(files, {
            cwd: buildSource,
            base: buildSource,
            allowEmpty: true,
          })
          // modify the package.json file
          .pipe(rewritePackageJson(buildSource, buildVersion, kibanaVersion))

          // put all files inside the correct directories
          .pipe(
            rename(function nestFileInDir(filePath) {
              const nonRelativeDirname = filePath.dirname.replace(/^(\.\.\/?)+/g, '');
              filePath.dirname = path.join(relative(buildTarget, buildRoot), nonRelativeDirname);
            })
          )

          .pipe(vfs.dest(buildTarget))
          .on('end', resolve)
          .on('error', reject);
      });
    })
    .then(function() {
      if (plugin.skipInstallDependencies) {
        return;
      }

      // install packages in build
      execa.sync(winCmd('yarn'), ['install', '--production', '--pure-lockfile'], {
        cwd: buildRoot,
      });
    })
    .then(function() {
      if (!plugin.styleSheetToCompile) {
        return;
      }

      const file = path.resolve(plugin.root, plugin.styleSheetToCompile);
      if (!existsSync(file)) {
        throw new Error(`Path provided for styleSheetToCompile does not exist: ${file}`);
      }

      const outputFileName = path.basename(file, path.extname(file)) + '.css';
      const output = path.join(buildRoot, path.dirname(plugin.styleSheetToCompile), outputFileName);

      const rendered = sass.renderSync({ file, output });
      writeFileSync(output, rendered.css);

      del.sync([path.join(buildRoot, '**', '*.s{a,c}ss')]);
    })
    .then(async function() {
      const buildConfigPath = path.join(buildRoot, 'tsconfig.json');

      if (!existsSync(buildConfigPath)) {
        return;
      }

      // attempt to patch the extends path in the tsconfig file
      const buildConfig = parseTsconfig(buildSource, buildConfigPath);

      if (buildConfig.extends) {
        buildConfig.extends = path.join(relative(buildRoot, buildSource), buildConfig.extends);

        writeFileSync(buildConfigPath, JSON.stringify(buildConfig));
      }

      // Transpile ts server code
      //
      // Include everything except content from public folders
      await transpileWithBabel(['**/*.{ts,tsx}', '!**/public/**'], buildRoot, [
        require.resolve('@kbn/babel-preset/node_preset'),
      ]);

      // Transpile ts client code
      //
      // Include everything inside a public directory
      await transpileWithBabel(['**/public/**/*.{ts,tsx}'], buildRoot, [
        require.resolve('@kbn/babel-preset/webpack_preset'),
      ]);

      del.sync([
        path.join(buildRoot, '**', '*.{ts,tsx,d.ts}'),
        path.join(buildRoot, 'tsconfig.json'),
      ]);
    })
    .then(function() {
      const buildFiles = [relative(buildTarget, buildRoot) + '/**/*'];

      return new Promise((resolve, reject) => {
        vfs
          .src(buildFiles, {
            cwd: buildTarget,
            base: buildTarget,
            resolveSymlinks: false,
          })
          .pipe(removeSymlinkDependencies(buildRoot))
          .on('finish', resolve)
          .on('error', reject);
      });
    });
};
