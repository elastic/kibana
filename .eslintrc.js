const prettierConfig = require('@elastic/eslint-config-kibana/prettier');
const node6Config = require('@elastic/eslint-config-kibana/node6');
const serverConfig = require('@elastic/eslint-config-kibana/server');
const uiConfig = require('@elastic/eslint-config-kibana/ui');
const mochaConfig = require('@elastic/eslint-config-kibana/mocha');
const jestConfig = require('@elastic/eslint-config-kibana/jest');
const withTypeScript = require('@elastic/eslint-config-kibana/with_typescript');

module.exports = {
  extends: ['@elastic/eslint-config-kibana'],

  settings: {
    'import/resolver': {
      '@elastic/eslint-import-resolver-kibana': {
        rootPackageName: 'kibana',
        kibanaPath: '.',
      },
    },
  },

  overrides: [
    // Anything transpiled with `@kbn/babel-preset/node`
    serverConfig({
      files: [
        'src/**/*.js',
        'test/**/*.js',
        'tasks/**/*.js',
        'utilities/**/*.js',
        'packages/kbn-pm/**/*.js',
      ],
      excludedFiles: ['src/**/public/**/*.js', 'src/**/common/**/*.js'],
    }),

    // Anything transpiled with `@kbn/babel-preset/webpack`
    uiConfig({
      files: [
        'src/**/public/**/*.js',
        'src/**/common/**/*.js',
        'ui_framework/**/*.js',
        'webpackShims/**/*.js',
        'test/functional/page_objects/**/*.js',
        'packages/kbn-datemath/**/*.js',
        'packages/kbn-test-subj-selector/**/*.js',
      ],
    }),

    // Files that are not transpiled, so they must work on current Node version
    node6Config({
      files: [
        '.eslintrc.js',
        'Gruntfile.js',
        'scripts/**/*.js',
        'packages/eslint-config-kibana/**/*.js',
        'packages/eslint-plugin-kibana-custom/**/*.js',
        'packages/kbn-babel-preset/**/*.js',
        'packages/kbn-plugin-helpers/**/*.js',
        'packages/kbn-plugin-generator/**/*.js',
      ],
    }),

    mochaConfig({
      files: [
        '**/__tests__/**/*.js',
        'test/**/*.js',
        'src/test_utils/**/*.js',
        'src/ui/public/test_harness/**/*.js',
        'src/functional_test_runner/lib/mocha/**/*.js',
        'src/core_plugins/timelion/public/lib/_tests_/**/*.js',
        'packages/kbn-datemath/test/**/*.js',
        'packages/kbn-test-subj-selector/test/**/*.js',
      ],
    }),

    jestConfig({
      files: ['**/*.test.js'],
    }),

    // Enable Prettier
    prettierConfig({
      files: [
        '.eslintrc.js',
        'packages/kbn-pm/**/*.js',
        'packages/kbn-datemath/**/*.js',
        'packages/kbn-plugin-generator/**/*.js',
        'packages/eslint-config-kibana/**/*.js',
        'packages/eslint-plugin-kibana-custom/**/*.js',
      ],
    }),

    withTypeScript(
      prettierConfig({
        files: ['packages/kbn-pm/**/*.ts'],
      })
    ),
  ],
};
