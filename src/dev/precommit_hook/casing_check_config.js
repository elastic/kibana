/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These patterns are used to identify files that are not supposed
 * to be snake_case because their names are determined by other
 * systems or rules.
 *
 * @type {Array}
 */
export const IGNORE_FILE_GLOBS = [
  '.node-version',
  '.github/**/*',
  'docs/**/*',
  '**/bin/**/*',
  '**/+([A-Z_]).md',
  '**/+([A-Z_]).mdx',
  '**/+([A-Z_]).asciidoc',
  '**/LICENSE',
  '**/*.txt',
  '**/{Dockerfile,docker-compose.yml}',
  'x-pack/plugins/canvas/tasks/**/*',
  'x-pack/plugins/canvas/canvas_plugin_src/**/*',
  'x-pack/plugins/cases/docs/**/*',
  'x-pack/plugins/monitoring/public/lib/jquery_flot/**/*',
  '**/.*',
  '**/__mocks__/**/*',
  'x-pack/docs/**/*',
  'src/core/server/core_app/assets/fonts/**/*',
  'src/dev/code_coverage/ingest_coverage/integration_tests/mocks/**/*',
  'packages/kbn-utility-types/test-d/**/*',
  '**/Jenkinsfile*',
  'Dockerfile*',
  'vars/*',
  '.ci/pipeline-library/**/*',
  'packages/kbn-test/jest-preset.js',
  'packages/kbn-test/*/jest-preset.js',
  'test/package/Vagrantfile',
  '**/test/**/fixtures/**/*',

  // Required to match the name in the docs.elastic.dev repo.
  'nav-kibana-dev.docnav.json',

  // filename must match language code which requires capital letters
  '**/translations/*.json',

  // Storybook has predetermined filesnames
  '**/preview-body.html',
  '**/preview-head.html',

  // filename required by api-extractor
  'api-documenter.json',

  // filename must match upstream filenames from lodash
  'packages/elastic-safer-lodash-set/**/*',

  'x-pack/plugins/maps/server/fonts/**/*',

  // Bazel default files
  '**/WORKSPACE.bazel',
  '**/BUILD.bazel',

  // Buildkite
  '.buildkite/**/*',

  // generator templates use weird filenames based on the requirements for the files they're generating
  'packages/kbn-generate/templates/**/*',
];

/**
 * These patterns are matched against directories and indicate
 * folders that must use kebab case.
 *
 * @type {Array}
 */
export const KEBAB_CASE_DIRECTORY_GLOBS = ['packages/*', 'x-pack'];

/**
 * These patterns are matched against directories and indicate
 * explicit folders that are NOT supposed to use snake_case.
 *
 * When a file in one of these directories is checked, the directory
 * matched by these patterns is removed from the path before
 * the casing check so that the files casing is still checked. This
 * allows folders like `src/legacy/ui/public/flot-charts` to exist, which
 * is named to match the npm package and follow the kebab-casing
 * convention there, but allows us to still verify that files within
 * that directory use snake_case
 *
 * @type {Array}
 */
export const IGNORE_DIRECTORY_GLOBS = [
  ...KEBAB_CASE_DIRECTORY_GLOBS,
  'src/babel-*',
  'packages/*',
  'packages/kbn-pm/src/utils/__fixtures__/*',
  'x-pack/dev-tools',
  'packages/kbn-optimizer/src/__fixtures__/mock_repo/x-pack',
  'typings/*',
];

/**
 * These patterns identify files which should have the extension stripped
 * to reveal the actual name that should be checked.
 *
 * @type {Array}
 */
export const REMOVE_EXTENSION = ['packages/kbn-plugin-generator/template/**/*.ejs'];

/**
 * DO NOT ADD FILES TO THIS LIST!!
 *
 * Use the other configs if the file really shouldn't be snake_case.
 *
 * These paths identify filenames that would be flagged by the current
 * rules but were in violation before we started properly enforcing these
 * rules. They will not cause errors but will log warnings because they
 * will hopefully be updated to use snake_case in the future.
 *
 * IDEALLY will will be able to trim this list over time
 *
 * @type {Array}
 */
export const TEMPORARILY_IGNORED_PATHS = [
  'src/core/server/core_app/assets/favicons/android-chrome-192x192.png',
  'src/core/server/core_app/assets/favicons/android-chrome-256x256.png',
  'src/core/server/core_app/assets/favicons/android-chrome-512x512.png',
  'src/core/server/core_app/assets/favicons/apple-touch-icon.png',
  'src/core/server/core_app/assets/favicons/favicon-16x16.png',
  'src/core/server/core_app/assets/favicons/favicon-32x32.png',
  'src/core/server/core_app/assets/favicons/mstile-70x70.png',
  'src/core/server/core_app/assets/favicons/mstile-144x144.png',
  'src/core/server/core_app/assets/favicons/mstile-150x150.png',
  'src/core/server/core_app/assets/favicons/mstile-310x150.png',
  'src/core/server/core_app/assets/favicons/mstile-310x310.png',
  'src/core/server/core_app/assets/favicons/safari-pinned-tab.svg',
  'test/functional/apps/management/exports/_import_objects-conflicts.json',
  'x-pack/legacy/plugins/index_management/public/lib/editSettings.js',
  'x-pack/legacy/plugins/license_management/public/store/reducers/licenseManagement.js',
  'x-pack/plugins/monitoring/public/icons/health-gray.svg',
  'x-pack/plugins/monitoring/public/icons/health-green.svg',
  'x-pack/plugins/monitoring/public/icons/health-red.svg',
  'x-pack/plugins/monitoring/public/icons/health-yellow.svg',
  'x-pack/plugins/screenshotting/server/formats/pdf/pdf_maker/assets/fonts/noto/NotoSansCJKtc-Medium.ttf',
  'x-pack/plugins/screenshotting/server/formats/pdf/pdf_maker/assets/fonts/noto/NotoSansCJKtc-Regular.ttf',
  'x-pack/plugins/screenshotting/server/formats/pdf/pdf_maker/assets/fonts/roboto/Roboto-Italic.ttf',
  'x-pack/plugins/screenshotting/server/formats/pdf/pdf_maker/assets/fonts/roboto/Roboto-Medium.ttf',
  'x-pack/plugins/screenshotting/server/formats/pdf/pdf_maker/assets/fonts/roboto/Roboto-Regular.ttf',
  'x-pack/plugins/screenshotting/server/formats/pdf/pdf_maker/assets/img/logo-grey.png',
];
