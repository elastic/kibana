/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import minimatch from 'minimatch';
import { discoverBazelPackages } from '@kbn/bazel-packages';
import { deleteAll, deleteEmptyFolders, scanDelete, Task, GlobalTask } from '../lib';

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

export const CleanPackageManagerRelatedFiles: Task = {
  description: 'Cleaning package manager related files from the build folder',

  async run(config, log, build) {
    await deleteAll([build.resolvePath('yarn.lock'), build.resolvePath('.npmrc')], log);
  },
};

export const CleanTypescript: Task = {
  description: 'Cleaning typescript source files that have been transpiled to JS',

  async run(config, log, build) {
    log.info(
      'Deleted %d files',
      await scanDelete({
        directory: build.resolvePath(),
        regularExpressions: [/\.(ts|tsx|d\.ts)$/, /tsconfig.*\.(json|tsbuildinfo)$/],
      })
    );
  },
};

export const CleanExtraFilesFromModules: Task = {
  description: 'Cleaning tests, examples, docs, etc. from node_modules',

  async run(config, log, build) {
    const makeRegexps = (patterns: string[]) =>
      patterns.map((pattern) => minimatch.makeRe(pattern, { nocase: true }));

    const regularExpressions = makeRegexps([
      // tests
      '**/test',
      '**/tests',
      '**/jest.config.js',
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
      '**/README.md',
      '**/readme.md',
      '**/README.markdown',
      '**/readme.markdown',
      '**/README',

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
      '**/bin',

      // linters
      '**/.eslintrc',
      '**/.eslintrc.js',
      '**/.eslintrc.yml',
      '**/.eslintrc.json',
      '**/.eslintignore',
      '**/.jshintignore',
      '**/.prettierrc',
      '**/.prettierrc.js',
      '**/.prettierrc.yaml',
      '**/.prettierrc.yml',
      '**/.jshintrc',
      '**/.babelrc',
      '**/.babelrc.js',
      '**/.jscs.json',
      '**/.lint',
      '**/.jscsrc',
      '**/.nycrc',
      '**/.taprc',

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
      '**/.tsbuildinfo',

      // editors
      '**/.editorconfig',
      '**/.vscode',
      '**/.idea',

      // git
      '**/.git',
      '**/.github',
      '**/.gitattributes',
      '**/.gitkeep',
      '**/.gitempty',
      '**/.gitmodules',
      '**/.keep',
      '**/.empty',
      '**/.patch',

      // ci
      '**/.travis.yml',
      '**/.gitlab-ci.yml',
      '**/circle.yml',
      '**/.coveralls.yml',
      '**/.istanbul.yml',
      '**/.appveyor.yml',
      '**/.zuul.yml',
      '**/.codeclimate.yml',
      '**/.codecov.yml',
      '**/.airtap.yml',
      '**/.gitpod.yml',

      // metadata
      '**/package-lock.json',
      '**/component.json',
      '**/bower.json',
      '**/yarn.lock',

      // misc
      '**/.*ignore',
      '**/*.log',
      '**/.nvmrc',
      '**/.DS_Store',
      '**/Dockerfile',
      '**/docker-compose.yml',

      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.webp',

      '**/*.zip',
      '**/*.7z',
      '**/*.rar',
      '**/*.tar',
      '**/*.tgz',
      '**/*.gz',

      '**/*.xml',

      '**/@elastic/eui/es',
      '**/@elastic/eui/test-env',
      '**/@elastic/eui/optimize',
      '**/@elastic/eui/i18ntokens.json',
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

export const CleanEmptyFolders: Task = {
  description: 'Cleaning all empty folders recursively',

  async run(config, log, build) {
    // Delete every single empty folder from
    // the distributable except the plugins
    // and data folder.
    await deleteEmptyFolders(log, build.resolvePath('.'), [
      build.resolvePath('plugins'),
      build.resolvePath('data'),
      build.resolvePath('logs'),
    ]);
  },
};

export const DeleteBazelPackagesFromBuildRoot: Task = {
  description:
    'Deleting bazel packages outputs from build folder root as they are now installed as node_modules',

  async run(config, log, build) {
    const bazelPackagesOnBuildRoot = (await discoverBazelPackages()).map((pkg) =>
      build.resolvePath(pkg.normalizedRepoRelativeDir)
    );

    await deleteAll(bazelPackagesOnBuildRoot, log);
  },
};
