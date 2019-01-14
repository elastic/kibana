const { resolve } = require('path');
const { readdirSync } = require('fs');

const restrictedModules = { paths: ['gulp-util'] };

const APACHE_2_0_LICENSE_HEADER = `
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
`;

const ELASTIC_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
`;

module.exports = {
  extends: ['@elastic/eslint-config-kibana', '@elastic/eslint-config-kibana/jest'],

  settings: {
    'import/resolver': {
      '@kbn/eslint-import-resolver-kibana': {
        forceNode: true,
      },
    },

    react: {
      version: '16.3',
    },
  },

  rules: {
    'no-restricted-imports': [2, restrictedModules],
    'no-restricted-modules': [2, restrictedModules],
  },

  overrides: [
    /**
     * Prettier
     */
    {
      files: [
        '.eslintrc.js',
        'packages/eslint-plugin-kibana-custom/**/*',
        'packages/kbn-config-schema/**/*',
        'packages/kbn-pm/**/*',
        'packages/kbn-es/**/*',
        'packages/elastic-datemath/**/*',
        'packages/kbn-i18n/**/*',
        'packages/kbn-dev-utils/**/*',
        'packages/kbn-plugin-helpers/**/*',
        'packages/kbn-plugin-generator/**/*',
        'packages/kbn-test-subj-selector/**/*',
        'packages/kbn-test/**/*',
        'packages/kbn-eslint-import-resolver-kibana/**/*',
        'x-pack/plugins/apm/**/*',
        'x-pack/plugins/canvas/**/*',
      ],
      plugins: ['prettier'],
      rules: Object.assign(
        {
          'prettier/prettier': ['error'],
        },
        require('eslint-config-prettier').rules,
        require('eslint-config-prettier/react').rules
      ),
    },

    /**
     * Allow default exports
     */
    {
      files: ['x-pack/test/functional/apps/**/*', 'x-pack/plugins/apm/**/*'],
      rules: {
        'kibana-custom/no-default-export': 'off',
        'import/no-named-as-default': 'off',
      },
    },

    /**
     * Files that are allowed to import webpack-specific stuff
     */
    {
      files: [
        '**/public/**',
        '**/webpackShims/**',
        'packages/kbn-ui-framework/doc_site/src/**',
        'src/fixtures/**', // TODO: this directory needs to be more obviously "public" (or go away)
      ],
      settings: {
        // instructs import/no-extraneous-dependencies to treat modules
        // in plugins/ or ui/ namespace as "core modules" so they don't
        // trigger failures for not being listed in package.json
        'import/core-modules': ['plugins', 'ui', 'uiExports'],

        'import/resolver': {
          '@kbn/eslint-import-resolver-kibana': {
            forceNode: false,
            rootPackageName: 'kibana',
            kibanaPath: '.',
            pluginMap: readdirSync(resolve(__dirname, 'x-pack/plugins')).reduce((acc, name) => {
              if (!name.startsWith('_')) {
                acc[name] = `x-pack/plugins/${name}`;
              }
              return acc;
            }, {}),
          },
        },
      },
    },

    /**
     * Files that ARE NOT allowed to use devDependencies
     */
    {
      files: ['packages/kbn-ui-framework/**/*', 'x-pack/**/*', 'packages/kbn-interpreter/**/*'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: false,
            peerDependencies: true,
          },
        ],
      },
    },

    /**
     * Files that ARE allowed to use devDependencies
     */
    {
      files: [
        'packages/kbn-ui-framework/**/*.test.js',
        'packages/kbn-ui-framework/doc_site/**/*',
        'packages/kbn-ui-framework/generator-kui/**/*',
        'packages/kbn-ui-framework/Gruntfile.js',
        'packages/kbn-es/src/**/*',
        'packages/kbn-interpreter/tasks/**/*',
        'packages/kbn-interpreter/src/plugin/**/*',
        'x-pack/{dev-tools,tasks,scripts,test,build_chromium}/**/*',
        'x-pack/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__}/**/*',
        'x-pack/**/*.test.js',
        'x-pack/gulpfile.js',
        'x-pack/plugins/apm/public/utils/testHelpers.js',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            peerDependencies: true,
          },
        ],
      },
    },

    /**
     * Files that run BEFORE node version check
     */
    {
      files: ['scripts/**/*', 'src/setup_node_env/**/*'],
      rules: {
        'import/no-commonjs': 'off',
        'prefer-object-spread/prefer-object-spread': 'off',
        'no-var': 'off',
        'prefer-const': 'off',
        'prefer-destructuring': 'off',
        'no-restricted-syntax': [
          'error',
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportDefaultDeclaration',
          'ExportAllDeclaration',
          'ArrowFunctionExpression',
          'AwaitExpression',
          'ClassDeclaration',
          'RestElement',
          'SpreadElement',
          'YieldExpression',
          'VariableDeclaration[kind="const"]',
          'VariableDeclaration[kind="let"]',
          'VariableDeclarator[id.type="ArrayPattern"]',
          'VariableDeclarator[id.type="ObjectPattern"]',
        ],
      },
    },

    /**
     * Files that run in the browser with only node-level transpilation
     */
    {
      files: [
        'test/functional/services/lib/leadfoot_element_wrapper/scroll_into_view_if_necessary.js',
      ],
      rules: {
        'prefer-object-spread/prefer-object-spread': 'off',
        'no-var': 'off',
        'prefer-const': 'off',
        'prefer-destructuring': 'off',
        'no-restricted-syntax': [
          'error',
          'ArrowFunctionExpression',
          'AwaitExpression',
          'ClassDeclaration',
          'RestElement',
          'SpreadElement',
          'YieldExpression',
          'VariableDeclaration[kind="const"]',
          'VariableDeclaration[kind="let"]',
          'VariableDeclarator[id.type="ArrayPattern"]',
          'VariableDeclarator[id.type="ObjectPattern"]',
        ],
      },
    },

    /**
     * Files that run AFTER node version check
     * and are not also transpiled with babel
     */
    {
      files: [
        '.eslintrc.js',
        '**/webpackShims/**/*',
        'packages/kbn-plugin-generator/**/*',
        'packages/kbn-plugin-helpers/**/*',
        'packages/kbn-eslint-import-resolver-kibana/**/*',
        'packages/kbn-eslint-plugin-license-header/**/*',
        'x-pack/gulpfile.js',
        'x-pack/dev-tools/mocha/setup_mocha.js',
        'x-pack/scripts/*',
      ],
      rules: {
        'import/no-commonjs': 'off',
        'prefer-object-spread/prefer-object-spread': 'off',
        'no-restricted-syntax': [
          'error',
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportDefaultDeclaration',
          'ExportAllDeclaration',
        ],
      },
    },

    /**
     * Files that require Apache 2.0 headers, settings
     * are overridden below for files that require Elastic
     * Licence headers
     */
    {
      files: ['**/*.js'],
      plugins: ['@kbn/eslint-plugin-license-header'],
      rules: {
        '@kbn/license-header/require-license-header': [
          'error',
          {
            license: APACHE_2_0_LICENSE_HEADER,
          },
        ],
        '@kbn/license-header/disallow-license-headers': [
          'error',
          {
            licenses: [ELASTIC_LICENSE_HEADER],
          },
        ],
      },
    },

    /**
     * X-Pack global overrides
     */
    {
      files: ['x-pack/**/*'],
      rules: {
        quotes: 'off',
      },
    },

    /**
     * Files that require Elastic license headers instead of Apache 2.0 header
     */
    {
      files: ['x-pack/**/*.js'],
      plugins: ['@kbn/eslint-plugin-license-header'],
      rules: {
        '@kbn/license-header/require-license-header': [
          'error',
          {
            license: ELASTIC_LICENSE_HEADER,
          },
        ],
        '@kbn/license-header/disallow-license-headers': [
          'error',
          {
            licenses: [APACHE_2_0_LICENSE_HEADER],
          },
        ],
      },
    },

    /**
     * APM overrides
     */
    {
      files: ['x-pack/plugins/apm/**/*'],
      rules: {
        'no-unused-vars': ['error', { ignoreRestSiblings: true }],
        'no-console': ['warn', { allow: ['error'] }],
      },
    },

    /**
     * GIS overrides
     */
    {
      files: ['x-pack/plugins/gis/**/*'],
      rules: {
        'react/prefer-stateless-function': [0, { ignorePureComponents: false }],
      },
    },

    /**
     * Graph overrides
     */
    {
      files: ['x-pack/plugins/graph/**/*'],
      globals: {
        angular: true,
        $: true,
      },
      rules: {
        'block-scoped-var': 'off',
        camelcase: 'off',
        eqeqeq: 'off',
        'guard-for-in': 'off',
        'new-cap': 'off',
        'no-loop-func': 'off',
        'no-redeclare': 'off',
        'no-shadow': 'off',
        'no-unused-vars': 'off',
        'one-var': 'off',
      },
    },

    /**
     * ML overrides
     */
    {
      files: ['x-pack/plugins/ml/**/*'],
      rules: {
        quotes: 'error',
        'no-shadow': 'error',
      },
    },

    /**
     * disable jsx-a11y for kbn-ui-framework
     */
    {
      files: ['packages/kbn-ui-framework/**'],
      rules: {
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/anchor-has-content': 'off',
        'jsx-a11y/tabindex-no-positive': 'off',
        'jsx-a11y/label-has-associated-control': 'off',
        'jsx-a11y/aria-role': 'off',
      },
    },

    /**
     * Monitoring overrides
     */
    {
      files: ['x-pack/plugins/monitoring/**/*'],
      rules: {
        'block-spacing': ['error', 'always'],
        curly: ['error', 'all'],
        'no-unused-vars': ['error', { args: 'all', argsIgnorePattern: '^_' }],
        'no-else-return': 'error',
      },
    },
    {
      files: ['x-pack/plugins/monitoring/public/**/*'],
      env: { browser: true },
    },

    /**
     * Canvas overrides
     */
    {
      files: ['x-pack/plugins/canvas/**/*'],
      rules: {
        radix: 'error',
        curly: ['error', 'all'],

        // module importing
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          },
        ],
        'import/extensions': ['error', 'never', { json: 'always', less: 'always', svg: 'always' }],

        // react
        'react/no-did-mount-set-state': 'error',
        'react/no-did-update-set-state': 'error',
        'react/no-multi-comp': ['error', { ignoreStateless: true }],
        'react/self-closing-comp': 'error',
        'react/sort-comp': 'error',
        'react/jsx-boolean-value': 'error',
        'react/jsx-wrap-multilines': 'error',
        'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
        'react/forbid-elements': [
          'error',
          {
            forbid: [
              {
                element: 'EuiConfirmModal',
                message: 'Use <ConfirmModal> instead',
              },
              {
                element: 'EuiPopover',
                message: 'Use <Popover> instead',
              },
              {
                element: 'EuiIconTip',
                message: 'Use <TooltipIcon> instead',
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        'x-pack/plugins/canvas/gulpfile.js',
        'x-pack/plugins/canvas/scripts/*.js',
        'x-pack/plugins/canvas/tasks/*.js',
        'x-pack/plugins/canvas/tasks/**/*.js',
        'x-pack/plugins/canvas/__tests__/**/*',
        'x-pack/plugins/canvas/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__}/**/*',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            peerDependencies: true,
          },
        ],
      },
    },
    {
      files: ['x-pack/plugins/canvas/canvas_plugin_src/**/*'],
      globals: { canvas: true, $: true },
      rules: {
        'import/no-unresolved': [
          'error',
          {
            ignore: ['!!raw-loader.+.svg$'],
          },
        ],
      },
    },
    {
      files: ['x-pack/plugins/canvas/public/**/*'],
      env: {
        browser: true,
      },
    },
    {
      files: ['x-pack/plugins/canvas/canvas_plugin_src/lib/flot-charts/**/*'],
      env: {
        jquery: true,
      },
    },
  ],
};
