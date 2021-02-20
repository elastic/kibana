/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import minimatch from 'minimatch';

import { deleteAll, deleteEmptyFolders, scanDelete, Task, GlobalTask } from '../lib';

function makeRegexps(patterns: string[]) {
  return patterns.map((pattern) => minimatch.makeRe(pattern, { nocase: true }));
}

export const Clean: GlobalTask = {
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

export const CleanNodeModules: Task = {
  description: 'Cleaning tests, examples, docs, etc. from node_modules',

  async run(config, log, build) {
    const regularExpressions = makeRegexps([
      // tests
      '**/test',
      '**/tests',
      '**/__tests__',
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
  },
};

export const CleanExtraBinScripts: Task = {
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

export const CleanBuild: Task = {
  description: 'Cleaning unnecessary files from build',

  async run(config, log, build) {
    // Delete every single empty folder from
    // the distributable except the plugins
    // and data folder.
    await deleteEmptyFolders(log, build.resolvePath('.'), [
      build.resolvePath('plugins'),
      build.resolvePath('data'),
    ]);

    log.info(
      'Deleted %d files',
      await scanDelete({
        directory: build.resolvePath(),
        regularExpressions: [/\.(ts|tsx|d\.ts)$/, /tsconfig.*\.json$/],
      })
    );

    // await deleteAll(
    //   [build.resolvePath('packages'), build.resolvePath('yarn.lock'), build.resolvePath('.npmrc')],
    //   log
    // );

    const regularExpressions = makeRegexps([
      // typescript
      '**/*.(ts|tsx|d.ts)',
      '**/tsconfig.json',
      '**/tsconfig.tsbuildinfo',

      // docs
      '**/*.(md|asciidoc)',

      // styles
      '**/*.asciidoc',

      // tests
      '**/__fixtures__/**',
    ]);

    log.info(
      'Deleted %d files',
      await scanDelete({
        directory: build.resolvePath(),
        regularExpressions,
      })
    );
  },
};
