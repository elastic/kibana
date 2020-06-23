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

import { relative } from 'path';
import path from 'path';

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import execa from 'execa';
import sass from 'node-sass';
import del from 'del';
import File from 'vinyl';
import vfs from 'vinyl-fs';
import rename from 'gulp-rename';
import through from 'through2';
import minimatch from 'minimatch';
// @ts-ignore
import gulpBabel from 'gulp-babel';

import { PluginConfig, winCmd, pipeline } from '../../lib';
import { rewritePackageJson } from './rewrite_package_json';

// `link:` dependencies create symlinks, but we don't want to include symlinks
// in the built zip file. Therefore we remove all symlinked dependencies, so we
// can re-create them when installing the plugin.
function removeSymlinkDependencies(root: string) {
  const nodeModulesPattern = path.join(root, '**', 'node_modules', '**');

  return through.obj((file: File, _, cb) => {
    const isSymlink = file.symlink != null;
    const isDependency = minimatch(file.path, nodeModulesPattern);

    if (isSymlink && isDependency) {
      unlinkSync(file.path);
    }

    cb();
  });
}

// parse a ts config file
function parseTsconfig(pluginSourcePath: string, configPath: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require(path.join(pluginSourcePath, 'node_modules', 'typescript'));

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
async function transpileWithBabel(srcGlobs: string[], buildRoot: string, presets: string[]) {
  await pipeline(
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

export async function createBuild(
  plugin: PluginConfig,
  buildTarget: string,
  buildVersion: string,
  kibanaVersion: string,
  files: string[]
) {
  const buildSource = plugin.root;
  const buildRoot = path.join(buildTarget, 'kibana', plugin.id);

  await del(buildTarget);

  // copy source files and apply some transformations in the process
  await pipeline(
    vfs.src(files, {
      cwd: buildSource,
      base: buildSource,
      allowEmpty: true,
    }),

    // modify the package.json file
    rewritePackageJson(buildSource, buildVersion, kibanaVersion),

    // put all files inside the correct directories
    rename(function nestFileInDir(filePath) {
      const nonRelativeDirname = filePath.dirname!.replace(/^(\.\.\/?)+/g, '');
      filePath.dirname = path.join(relative(buildTarget, buildRoot), nonRelativeDirname);
    }),

    // write files back to disk
    vfs.dest(buildTarget)
  );

  // install packages in build
  if (!plugin.skipInstallDependencies) {
    execa.sync(winCmd('yarn'), ['install', '--production', '--pure-lockfile'], {
      cwd: buildRoot,
    });
  }

  // compile stylesheet
  if (typeof plugin.styleSheetToCompile === 'string') {
    const file = path.resolve(plugin.root, plugin.styleSheetToCompile);
    if (!existsSync(file)) {
      throw new Error(`Path provided for styleSheetToCompile does not exist: ${file}`);
    }

    const outputFileName = path.basename(file, path.extname(file)) + '.css';
    const output = path.join(buildRoot, path.dirname(plugin.styleSheetToCompile), outputFileName);

    const rendered = sass.renderSync({ file, output });
    writeFileSync(output, rendered.css);

    del.sync([path.join(buildRoot, '**', '*.s{a,c}ss')]);
  }

  // transform typescript to js and clean out typescript
  const tsConfigPath = path.join(buildRoot, 'tsconfig.json');
  if (existsSync(tsConfigPath)) {
    // attempt to patch the extends path in the tsconfig file
    const buildConfig = parseTsconfig(buildSource, tsConfigPath);

    if (buildConfig.extends) {
      buildConfig.extends = path.join(relative(buildRoot, buildSource), buildConfig.extends);

      writeFileSync(tsConfigPath, JSON.stringify(buildConfig));
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
  }

  // remove symlinked dependencies
  await pipeline(
    vfs.src([relative(buildTarget, buildRoot) + '/**/*'], {
      cwd: buildTarget,
      base: buildTarget,
      resolveSymlinks: false,
    }),

    removeSymlinkDependencies(buildRoot)
  );
}
