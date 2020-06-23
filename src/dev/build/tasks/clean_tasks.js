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

import minimatch from 'minimatch';

import { deleteAll, deleteEmptyFolders, scanDelete } from '../lib';

export const CleanTask = {
  global: true,
  description: 'Cleaning artifacts from previous builds',

  async run(config, log) {
    await deleteAll(
      [
        config.resolveFromRepo('build'),
        config.resolveFromRepo('target'),
        config.resolveFromRepo('.node_binaries'),
      ],
      log
    );
  },
};

export const CleanPackagesTask = {
  description: 'Cleaning source for packages that are now installed in node_modules',

  async run(config, log, build) {
    await deleteAll([build.resolvePath('packages'), build.resolvePath('yarn.lock')], log);
  },
};

export const CleanTypescriptTask = {
  description: 'Cleaning typescript source files that have been transpiled to JS',

  async run(config, log, build) {
    log.info(
      'Deleted %d files',
      await scanDelete({
        directory: build.resolvePath(),
        regularExpressions: [/\.(ts|tsx|d\.ts)$/, /tsconfig.*\.json$/],
      })
    );
  },
};

export const CleanExtraFilesFromModulesTask = {
  description: 'Cleaning tests, examples, docs, etc. from node_modules',

  async run(config, log, build) {
    const makeRegexps = (patterns) =>
      patterns.map((pattern) => minimatch.makeRe(pattern, { nocase: true }));

    const regularExpressions = makeRegexps([
      // tests
      '**/test',
      '**/tests',
      '**/__tests__',
      '**/mocha.opts',
      '**/*.test.js',
      '**/*.snap',
      '**/coverage',

      // docs
      '**/doc',
      '**/docs',
      '**/CONTRIBUTING.md',
      '**/Contributing.md',
      '**/contributing.md',
      '**/History.md',
      '**/HISTORY.md',
      '**/history.md',
      '**/CHANGELOG.md',
      '**/Changelog.md',
      '**/changelog.md',

      // examples
      '**/example',
      '**/examples',
      '**/demo',
      '**/samples',

      // bins
      '**/.bin',

      // linters
      '**/.eslintrc',
      '**/.eslintrc.js',
      '**/.eslintrc.yml',
      '**/.prettierrc',
      '**/.jshintrc',
      '**/.babelrc',
      '**/.jscs.json',
      '**/.lint',

      // hints
      '**/*.flow',
      '**/*.webidl',
      '**/*.map',
      '**/@types',

      // scripts
      '**/*.sh',
      '**/*.bat',
      '**/*.exe',
      '**/Gruntfile.js',
      '**/gulpfile.js',
      '**/Makefile',

      // untranspiled sources
      '**/*.coffee',
      '**/*.scss',
      '**/*.sass',
      '**/.ts',
      '**/.tsx',

      // editors
      '**/.editorconfig',
      '**/.vscode',

      // git
      '**/.gitattributes',
      '**/.gitkeep',
      '**/.gitempty',
      '**/.gitmodules',
      '**/.keep',
      '**/.empty',

      // ci
      '**/.travis.yml',
      '**/.coveralls.yml',
      '**/.instanbul.yml',
      '**/appveyor.yml',
      '**/.zuul.yml',

      // metadata
      '**/package-lock.json',
      '**/component.json',
      '**/bower.json',
      '**/yarn.lock',

      // misc
      '**/.*ignore',
      '**/.DS_Store',
      '**/Dockerfile',
      '**/docker-compose.yml',
    ]);

    log.info(
      'Deleted %d files',
      await scanDelete({
        directory: build.resolvePath('node_modules'),
        regularExpressions,
      })
    );

    if (!build.isOss()) {
      log.info(
        'Deleted %d files',
        await scanDelete({
          directory: build.resolvePath('x-pack/node_modules'),
          regularExpressions,
        })
      );
    }
  },
};

export const CleanExtraBinScriptsTask = {
  description: 'Cleaning extra bin/* scripts from platform-specific builds',

  async run(config, log, build) {
    for (const platform of config.getNodePlatforms()) {
      if (platform.isWindows()) {
        await deleteAll(
          [
            build.resolvePathForPlatform(platform, 'bin', '*'),
            `!${build.resolvePathForPlatform(platform, 'bin', '*.bat')}`,
          ],
          log
        );
      } else {
        await deleteAll([build.resolvePathForPlatform(platform, 'bin', '*.bat')], log);
      }
    }
  },
};

export const CleanExtraBrowsersTask = {
  description: 'Cleaning extra browsers from platform-specific builds',

  async run(config, log, build) {
    const getBrowserPathsForPlatform = (platform) => {
      const reportingDir = 'x-pack/plugins/reporting';
      const chromiumDir = '.chromium';
      const chromiumPath = (p) =>
        build.resolvePathForPlatform(platform, reportingDir, chromiumDir, p);
      return (platforms) => {
        const paths = [];
        if (platforms.windows) {
          paths.push(chromiumPath('chromium-*-win32.zip'));
          paths.push(chromiumPath('chromium-*-windows.zip'));
        }

        if (platforms.darwin) {
          paths.push(chromiumPath('chromium-*-darwin.zip'));
        }

        if (platforms.linux) {
          paths.push(chromiumPath('chromium-*-linux.zip'));
        }
        return paths;
      };
    };
    for (const platform of config.getNodePlatforms()) {
      const getBrowserPaths = getBrowserPathsForPlatform(platform);
      if (platform.isWindows()) {
        await deleteAll(getBrowserPaths({ linux: true, darwin: true }), log);
      } else if (platform.isMac()) {
        await deleteAll(getBrowserPaths({ linux: true, windows: true }), log);
      } else if (platform.isLinux()) {
        await deleteAll(getBrowserPaths({ windows: true, darwin: true }), log);
      }
    }
  },
};

export const CleanEmptyFoldersTask = {
  description: 'Cleaning all empty folders recursively',

  async run(config, log, build) {
    // Delete every single empty folder from
    // the distributable except the plugins
    // and data folder.
    await deleteEmptyFolders(log, build.resolvePath('.'), [
      build.resolvePath('plugins'),
      build.resolvePath('data'),
    ]);
  },
};
