/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { deleteAll, deleteEmptyFolders, scanDelete, Task, GlobalTask } from '../lib';

export const Clean: GlobalTask = {
  global: true,
  description: 'Cleaning artifacts from previous builds',

  async run(config, log) {
    await deleteAll(
      [
        config.resolveFromRepo('build'),
        config.resolveFromRepo('target'),
        config.downloadFreshNode ? config.resolveFromRepo('.node_binaries') : [],
      ].flat(),
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

export const CleanExtraFilesFromModules: Task = {
  description: 'Cleaning tests, examples, docs, etc. from node_modules',

  async run(config, log, build) {
    log.info(
      'Deleted %d files',
      await scanDelete(build.resolvePath('node_modules'), {
        match: [
          '!@kbn/**',

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
          '**/README',
          '**/CONTRIBUTING.md',
          '**/README.*',

          '**/History.md',
          '**/HISTORY.md',
          '**/history.md',
          '**/CHANGELOG.md',
          '**/Changelog.md',
          '**/changelog.md',

          '**/CODE_OF_CONDUCT.md',

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

          // untranspiled sources, tranpiler configs
          '**/*.coffee',
          '**/*.scss',
          '**/*.sass',
          '**/*.ts',
          '**/*.tsx',
          '**/tsconfig.json',
          '**/.tsbuildinfo',
          '**/babel.config.*',

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
          '**/karma.conf.ci.js',
          '**/karma.conf.js',
          '**/karma-ci.conf.js',

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

          // images, archives, random files for other languages
          '**/*.{png,jpg,jpeg,gif,webp,zip,7z,rar,tar,tgz,gz,cc,pl,py,gz,h,xml,html}',

          '**/*.development.js',
          '**/*.dev.js',
          '**/benchmark',
          '**/benchmarks',
          '**/benchmark.js',
          '**/benchmarks.js',

          '**/@elastic/eui/es',
          '**/@elastic/eui/test-env',
          '**/@elastic/eui/optimize',
          '**/@elastic/eui/i18ntokens.json',
        ],
        matchOptions: {
          caseInsensitive: true,
        },
      })
    );
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

export const DeletePackagesFromBuildRoot: Task = {
  description: 'Deleting package source directories as they are now installed as node_modules',
  async run(config, log, build) {
    await deleteAll(
      getPackages(REPO_ROOT).map((pkg) => build.resolvePath(pkg.normalizedRepoRelativeDir)),
      log
    );
  },
};
