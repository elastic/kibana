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

const join = require('path').join;
const relative = require('path').relative;
const { readFileSync, writeFileSync, unlinkSync, existsSync } = require('fs');
const execFileSync = require('child_process').execFileSync;
const del = require('del');
const vfs = require('vinyl-fs');
const rename = require('gulp-rename');
const through = require('through2');
const minimatch = require('minimatch');

const rewritePackageJson = require('./rewrite_package_json');
const winCmd = require('../../lib/win_cmd');

// `link:` dependencies create symlinks, but we don't want to include symlinks
// in the built zip file. Therefore we remove all symlinked dependencies, so we
// can re-create them when installing the plugin.
function removeSymlinkDependencies(root) {
  const nodeModulesPattern = join(root, '**', 'node_modules', '**');

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
  const ts = require(join(pluginSourcePath, 'node_modules', 'typescript'));

  const { error, config } = ts.parseConfigFileTextToJson(
    configPath,
    readFileSync(configPath, 'utf8')
  );

  if (error) {
    throw error;
  }

  return config;
}

module.exports = function createBuild(
  plugin,
  buildTarget,
  buildVersion,
  kibanaVersion,
  files
) {
  const buildSource = plugin.root;
  const buildRoot = join(buildTarget, 'kibana', plugin.id);

  return del(buildTarget)
    .then(function() {
      return new Promise(function(resolve, reject) {
        vfs
          .src(files, { cwd: buildSource, base: buildSource, allowEmpty: true })
          // modify the package.json file
          .pipe(rewritePackageJson(buildSource, buildVersion, kibanaVersion))

          // put all files inside the correct directories
          .pipe(
            rename(function nestFileInDir(path) {
              const nonRelativeDirname = path.dirname.replace(
                /^(\.\.\/?)+/g,
                ''
              );
              path.dirname = join(
                relative(buildTarget, buildRoot),
                nonRelativeDirname
              );
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
      const options = {
        cwd: buildRoot,
        stdio: ['ignore', 'ignore', 'pipe'],
      };

      execFileSync(
        winCmd('yarn'),
        ['install', '--production', '--pure-lockfile'],
        options
      );
    })
    .then(function() {
      const buildConfigPath = join(buildRoot, 'tsconfig.json');

      if (!existsSync(buildConfigPath)) {
        return;
      }

      if (!plugin.pkg.devDependencies.typescript) {
        throw new Error(
          'Found tsconfig.json file in plugin but typescript is not a devDependency.'
        );
      }

      // attempt to patch the extends path in the tsconfig file
      const buildConfig = parseTsconfig(buildSource, buildConfigPath);

      if (buildConfig.extends) {
        buildConfig.extends = join(
          relative(buildRoot, buildSource),
          buildConfig.extends
        );

        writeFileSync(buildConfigPath, JSON.stringify(buildConfig));
      }

      execFileSync(
        join(buildSource, 'node_modules', '.bin', winCmd('tsc')),
        ['--pretty', 'true'],
        {
          cwd: buildRoot,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      del.sync([
        join(buildRoot, '**', '*.{ts,tsx,d.ts}'),
        join(buildRoot, 'tsconfig.json'),
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
