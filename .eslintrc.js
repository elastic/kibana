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

const { readdirSync } = require('fs');
const { resolve } = require('path');

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

const allMochaRulesOff = {};
Object.keys(require('eslint-plugin-mocha').rules).forEach(k => {
  allMochaRulesOff['mocha/' + k] = 'off';
});

module.exports = {
  root: true,

  extends: ['@elastic/eslint-config-kibana', 'plugin:@elastic/eui/recommended'],

  overrides: [
    /**
     * Temporarily disable some react rules for specific plugins, remove in separate PRs
     */
    {
      files: ['packages/kbn-ui-framework/**/*.{js,ts,tsx}'],
      rules: {
        'jsx-a11y/no-onchange': 'off',
      },
    },
    {
      files: ['src/plugins/es_ui_shared/**/*.{js,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: ['src/plugins/kibana_react/**/*.{js,ts,tsx}'],
      rules: {
        'react-hooks/rules-of-hooks': 'off',
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: ['src/plugins/kibana_utils/**/*.{js,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: ['x-pack/plugins/canvas/**/*.{js,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
        'jsx-a11y/click-events-have-key-events': 'off',
      },
    },
    {
      files: ['x-pack/plugins/cross_cluster_replication/**/*.{js,ts,tsx}'],
      rules: {
        'jsx-a11y/click-events-have-key-events': 'off',
      },
    },
    {
      files: ['x-pack/legacy/plugins/index_management/**/*.{js,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
        'react-hooks/rules-of-hooks': 'off',
      },
    },
    {
      files: ['x-pack/plugins/lens/**/*.{js,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: ['x-pack/plugins/ml/**/*.{js,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: ['x-pack/legacy/plugins/snapshot_restore/**/*.{js,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },

    /**
     * Files that require Apache 2.0 headers, settings
     * are overridden below for files that require Elastic
     * Licence headers
     */
    {
      files: ['**/*.{js,ts,tsx}', '!plugins/**/*'],
      rules: {
        '@kbn/eslint/require-license-header': [
          'error',
          {
            license: APACHE_2_0_LICENSE_HEADER,
          },
        ],
        '@kbn/eslint/disallow-license-headers': [
          'error',
          {
            licenses: [ELASTIC_LICENSE_HEADER],
          },
        ],
      },
    },

    /**
     * New Platform client-side
     */
    {
      files: ['{src,x-pack}/plugins/*/public/**/*.{js,ts,tsx}'],
      rules: {
        'import/no-commonjs': 'error',
      },
    },

    /**
     * Files that require Elastic license headers instead of Apache 2.0 header
     */
    {
      files: ['x-pack/**/*.{js,ts,tsx}'],
      rules: {
        '@kbn/eslint/require-license-header': [
          'error',
          {
            license: ELASTIC_LICENSE_HEADER,
          },
        ],
        '@kbn/eslint/disallow-license-headers': [
          'error',
          {
            licenses: [APACHE_2_0_LICENSE_HEADER],
          },
        ],
      },
    },

    /**
     * Restricted paths
     */
    {
      files: ['**/*.{js,ts,tsx}'],
      rules: {
        '@kbn/eslint/no-restricted-paths': [
          'error',
          {
            basePath: __dirname,
            zones: [
              {
                target: ['(src|x-pack)/**/*', '!src/core/**/*'],
                from: ['src/core/utils/**/*'],
                errorMessage: `Plugins may only import from src/core/server and src/core/public.`,
              },
              {
                target: [
                  '(src|x-pack)/legacy/**/*',
                  '(src|x-pack)/plugins/**/(public|server)/**/*',
                  'examples/**/*',
                ],
                from: [
                  'src/core/public/**/*',
                  '!src/core/public/index.ts', // relative import
                  '!src/core/public/mocks{,.ts}',
                  '!src/core/server/types{,.ts}',
                  '!src/core/public/utils/**/*',
                  '!src/core/public/*.test.mocks{,.ts}',

                  'src/core/server/**/*',
                  '!src/core/server/index.ts', // relative import
                  '!src/core/server/mocks{,.ts}',
                  '!src/core/server/types{,.ts}',
                  '!src/core/server/test_utils',
                  // for absolute imports until fixed in
                  // https://github.com/elastic/kibana/issues/36096
                  '!src/core/server/*.test.mocks{,.ts}',

                  'target/types/**',
                ],
                allowSameFolder: true,
                errorMessage:
                  'Plugins may only import from top-level public and server modules in core.',
              },
              {
                target: [
                  '(src|x-pack)/legacy/**/*',
                  '(src|x-pack)/plugins/**/(public|server)/**/*',
                  'examples/**/*',
                  '!(src|x-pack)/**/*.test.*',
                  '!(x-pack/)?test/**/*',
                  // next folder contains legacy browser tests which can't be migrated to jest
                  // which import np files
                  '!src/legacy/core_plugins/kibana/public/__tests__/**/*',
                ],
                from: [
                  '(src|x-pack)/plugins/**/(public|server)/**/*',
                  '!(src|x-pack)/plugins/**/(public|server)/mocks/index.{js,ts}',
                  '!(src|x-pack)/plugins/**/(public|server)/(index|mocks).{js,ts,tsx}',
                ],
                allowSameFolder: true,
                errorMessage: 'Plugins may only import from top-level public and server modules.',
              },
              {
                target: [
                  '(src|x-pack)/plugins/**/*',
                  '!(src|x-pack)/plugins/**/server/**/*',

                  'src/legacy/core_plugins/**/*',
                  '!src/legacy/core_plugins/**/server/**/*',
                  '!src/legacy/core_plugins/**/index.{js,ts,tsx}',

                  'x-pack/legacy/plugins/**/*',
                  '!x-pack/legacy/plugins/**/server/**/*',
                  '!x-pack/legacy/plugins/**/index.{js,ts,tsx}',

                  'examples/**/*',
                  '!examples/**/server/**/*',
                ],
                from: [
                  'src/core/server',
                  'src/core/server/**/*',
                  '(src|x-pack)/plugins/*/server/**/*',
                  'examples/**/server/**/*',
                  // TODO: Remove the 'joi' eslint rule once IE11 support is dropped
                  'joi',
                ],
                errorMessage:
                  'Server modules cannot be imported into client modules or shared modules.',
              },
              {
                target: ['src/**/*'],
                from: ['x-pack/**/*'],
                errorMessage: 'OSS cannot import x-pack files.',
              },
              {
                target: ['src/core/**/*'],
                from: [
                  'plugins/**/*',
                  'src/plugins/**/*',
                  'src/legacy/core_plugins/**/*',
                  'src/legacy/ui/**/*',
                ],
                errorMessage: 'The core cannot depend on any plugins.',
              },
              {
                target: ['(src|x-pack)/plugins/*/public/**/*'],
                from: ['ui/**/*', 'uiExports/**/*'],
                errorMessage: 'Plugins cannot import legacy UI code.',
              },
              {
                from: ['src/legacy/ui/**/*', 'ui/**/*'],
                target: [
                  'test/plugin_functional/plugins/**/public/np_ready/**/*',
                  'test/plugin_functional/plugins/**/server/np_ready/**/*',
                  'src/legacy/core_plugins/**/public/np_ready/**/*',
                  'src/legacy/core_plugins/vis_type_*/public/**/*',
                  '!src/legacy/core_plugins/vis_type_*/public/legacy*',
                  'src/legacy/core_plugins/**/server/np_ready/**/*',
                  'x-pack/legacy/plugins/**/public/np_ready/**/*',
                  'x-pack/legacy/plugins/**/server/np_ready/**/*',
                ],
                allowSameFolder: true,
                errorMessage:
                  'NP-ready code should not import from /src/legacy/ui/** folder. ' +
                  'Instead of importing from /src/legacy/ui/** deeply within a np_ready folder, ' +
                  'import those things once at the top level of your plugin and pass those down, just ' +
                  'like you pass down `core` and `plugins` objects.',
              },
            ],
          },
        ],
      },
    },

    /**
     * Allow default exports
     */
    {
      files: [
        'x-pack/test/functional/apps/**/*.js',
        'x-pack/plugins/apm/**/*.js',
        'test/*/config.ts',
        'test/*/config_open.ts',
        'test/*/{tests,test_suites,apis,apps}/**/*',
        'test/visual_regression/tests/**/*',
        'x-pack/test/*/{tests,test_suites,apis,apps}/**/*',
        'x-pack/test/*/*config.*ts',
        'x-pack/test/saved_object_api_integration/*/apis/**/*',
        'x-pack/test/ui_capabilities/*/tests/**/*',
      ],
      rules: {
        'import/no-default-export': 'off',
        'import/no-named-as-default': 'off',
      },
    },

    /**
     * Files that are allowed to import webpack-specific stuff
     */
    {
      files: [
        '**/public/**/*.js',
        '**/webpackShims/**/*.js',
        'packages/kbn-ui-framework/doc_site/src/**/*.js',
        'src/fixtures/**/*.js', // TODO: this directory needs to be more obviously "public" (or go away)
      ],
      settings: {
        // instructs import/no-extraneous-dependencies to treat certain modules
        // as core modules, even if they aren't listed in package.json
        'import/core-modules': ['plugins', 'legacy/ui', 'uiExports'],

        'import/resolver': {
          '@kbn/eslint-import-resolver-kibana': {
            forceNode: false,
            rootPackageName: 'kibana',
            kibanaPath: '.',
            pluginMap: readdirSync(resolve(__dirname, 'x-pack/legacy/plugins')).reduce(
              (acc, name) => {
                if (!name.startsWith('_')) {
                  acc[name] = `x-pack/legacy/plugins/${name}`;
                }
                return acc;
              },
              {}
            ),
          },
        },
      },
    },

    /**
     * Files that ARE NOT allowed to use devDependencies
     */
    {
      files: [
        'packages/kbn-ui-framework/**/*.js',
        'x-pack/**/*.js',
        'packages/kbn-interpreter/**/*.js',
      ],
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
        'packages/kbn-ui-framework/doc_site/**/*.js',
        'packages/kbn-ui-framework/generator-kui/**/*.js',
        'packages/kbn-ui-framework/Gruntfile.js',
        'packages/kbn-es/src/**/*.js',
        'packages/kbn-interpreter/tasks/**/*.js',
        'packages/kbn-interpreter/src/plugin/**/*.js',
        'x-pack/{dev-tools,tasks,scripts,test,build_chromium}/**/*.js',
        'x-pack/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__}/**/*.js',
        'x-pack/**/*.test.js',
        'x-pack/test_utils/**/*',
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
      files: ['scripts/**/*.js', 'src/setup_node_env/**/*.js'],
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
        'test/functional/services/lib/web_element_wrapper/scroll_into_view_if_necessary.js',
        '**/browser_exec_scripts/**/*.js',
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
          'ImportDeclaration',
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
        '**/webpackShims/**/*.js',
        'packages/kbn-plugin-generator/**/*.js',
        'packages/kbn-eslint-import-resolver-kibana/**/*.js',
        'packages/kbn-eslint-plugin-eslint/**/*',
        'x-pack/gulpfile.js',
        'x-pack/dev-tools/mocha/setup_mocha.js',
        'x-pack/scripts/*.js',
      ],
      excludedFiles: ['**/integration_tests/**/*'],
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
     * Jest specific rules
     */
    {
      files: ['**/*.test.{js,ts,tsx}'],
      rules: {
        'jest/valid-describe': 'error',
      },
    },

    /**
     * Harden specific rules
     */
    {
      files: ['test/harden/*.js'],
      rules: allMochaRulesOff,
    },

    /**
     * APM overrides
     */
    {
      files: ['x-pack/plugins/apm/**/*.js'],
      rules: {
        'no-unused-vars': ['error', { ignoreRestSiblings: true }],
        'no-console': ['warn', { allow: ['error'] }],
      },
    },
    {
      plugins: ['react-hooks'],
      files: ['x-pack/plugins/apm/**/*.{ts,tsx}'],
      rules: {
        'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
        'react-hooks/exhaustive-deps': ['error', { additionalHooks: '^useFetcher$' }],
      },
    },

    /**
     * GIS overrides
     */
    {
      files: ['x-pack/legacy/plugins/maps/**/*.js'],
      rules: {
        'react/prefer-stateless-function': [0, { ignorePureComponents: false }],
      },
    },

    /**
     * ML overrides
     */
    {
      files: ['x-pack/plugins/ml/**/*.js'],
      rules: {
        'no-shadow': 'error',
        'import/no-extraneous-dependencies': [
          'error',
          {
            packageDir: './x-pack',
          },
        ],
      },
    },

    /**
     * SIEM overrides
     */
    {
      // front end typescript and javascript files only
      files: ['x-pack/plugins/siem/public/**/*.{js,ts,tsx}'],
      rules: {
        'import/no-nodejs-modules': 'error',
        'no-restricted-imports': [
          'error',
          {
            // prevents UI code from importing server side code and then webpack including it when doing builds
            patterns: ['**/server/*'],
          },
        ],
      },
    },
    {
      // typescript only for front and back end
      files: ['x-pack/{,legacy/}plugins/siem/**/*.{ts,tsx}'],
      rules: {
        // This will be turned on after bug fixes are complete
        // '@typescript-eslint/explicit-member-accessibility': 'warn',
        '@typescript-eslint/no-this-alias': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-useless-constructor': 'error',
        // This will be turned on after bug fixes are complete
        // '@typescript-eslint/no-object-literal-type-assertion': 'warn',
        '@typescript-eslint/unified-signatures': 'error',

        // eventually we want this to be a warn and then an error since this is a recommended linter rule
        // for now, keeping it commented out to avoid too much IDE noise until the other linter issues
        // are fixed in the next release or two
        // '@typescript-eslint/explicit-function-return-type': 'warn',

        // these rules cannot be turned on and tested at the moment until this issue is resolved:
        // https://github.com/prettier/prettier-eslint/issues/201
        // '@typescript-eslint/await-thenable': 'error',
        // '@typescript-eslint/no-non-null-assertion': 'error'
        // '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        // '@typescript-eslint/no-unused-vars': 'error',
        // '@typescript-eslint/prefer-includes': 'error',
        // '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        // '@typescript-eslint/promise-function-async': 'error',
        // '@typescript-eslint/prefer-regexp-exec': 'error',
        // '@typescript-eslint/promise-function-async': 'error',
        // '@typescript-eslint/require-array-sort-compare': 'error',
        // '@typescript-eslint/restrict-plus-operands': 'error',
        // '@typescript-eslint/unbound-method': 'error',
      },
    },
    // {
    //   // will introduced after the other warns are fixed
    //   // typescript and javascript for front end react performance
    //   files: ['x-pack/plugins/siem/public/**/!(*.test).{js,ts,tsx}'],
    //   plugins: ['react-perf'],
    //   rules: {
    //     // 'react-perf/jsx-no-new-object-as-prop': 'error',
    //     // 'react-perf/jsx-no-new-array-as-prop': 'error',
    //     // 'react-perf/jsx-no-new-function-as-prop': 'error',
    //     // 'react/jsx-no-bind': 'error',
    //   },
    // },
    {
      // typescript and javascript for front and back end
      files: ['x-pack/{,legacy/}plugins/siem/**/*.{js,ts,tsx}'],
      plugins: ['eslint-plugin-node', 'react'],
      env: {
        mocha: true,
        jest: true,
      },
      rules: {
        'accessor-pairs': 'error',
        'array-callback-return': 'error',
        'no-array-constructor': 'error',
        complexity: 'warn',
        // This will be turned on after bug fixes are mostly completed
        // 'consistent-return': 'warn',
        // This will be turned on after bug fixes are mostly completed
        // 'func-style': ['warn', 'expression'],
        // These will be turned on after bug fixes are mostly completed and we can
        // run a fix-lint
        /*
        'import/order': [
          'warn',
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
            'newlines-between': 'always',
          },
        ],
        */
        'node/no-deprecated-api': 'error',
        'no-bitwise': 'error',
        'no-continue': 'error',
        'no-dupe-keys': 'error',
        'no-duplicate-case': 'error',
        'no-duplicate-imports': 'error',
        'no-empty-character-class': 'error',
        'no-empty-pattern': 'error',
        'no-ex-assign': 'error',
        'no-extend-native': 'error',
        'no-extra-bind': 'error',
        'no-extra-boolean-cast': 'error',
        'no-extra-label': 'error',
        'no-func-assign': 'error',
        'no-implicit-globals': 'error',
        'no-implied-eval': 'error',
        'no-invalid-regexp': 'error',
        'no-inner-declarations': 'error',
        'no-lone-blocks': 'error',
        'no-multi-assign': 'error',
        'no-misleading-character-class': 'error',
        'no-new-symbol': 'error',
        'no-obj-calls': 'error',
        'no-param-reassign': 'error',
        'no-process-exit': 'error',
        'no-prototype-builtins': 'error',
        'no-return-await': 'error',
        'no-self-compare': 'error',
        'no-shadow-restricted-names': 'error',
        'no-sparse-arrays': 'error',
        'no-this-before-super': 'error',
        'no-undef': 'error',
        'no-unreachable': 'error',
        'no-unsafe-finally': 'error',
        'no-useless-call': 'error',
        'no-useless-catch': 'error',
        'no-useless-concat': 'error',
        'no-useless-computed-key': 'error',
        // This will be turned on after bug fixes are mostly complete
        // 'no-useless-escape': 'warn',
        'no-useless-rename': 'error',
        'no-useless-return': 'error',
        // This will be turned on after bug fixers are mostly complete
        // 'no-void': 'warn',
        'one-var-declaration-per-line': 'error',
        'prefer-object-spread': 'error',
        'prefer-promise-reject-errors': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'prefer-template': 'error',
        'react/boolean-prop-naming': 'error',
        'react/button-has-type': 'error',
        'react/display-name': 'error',
        'react/forbid-dom-props': 'error',
        'react/no-access-state-in-setstate': 'error',
        'react/no-children-prop': 'error',
        'react/no-danger-with-children': 'error',
        'react/no-deprecated': 'error',
        'react/no-did-mount-set-state': 'error',
        // Re-enable once we have better options per this issue:
        // https://github.com/airbnb/javascript/issues/1875
        // 'react/no-did-update-set-state': 'error',
        'react/no-direct-mutation-state': 'error',
        'react/no-find-dom-node': 'error',
        'react/no-redundant-should-component-update': 'error',
        'react/no-render-return-value': 'error',
        'react/no-typos': 'error',
        'react/no-string-refs': 'error',
        'react/no-this-in-sfc': 'error',
        'react/no-unescaped-entities': 'error',
        'react/no-unsafe': 'error',
        'react/no-unused-prop-types': 'error',
        'react/no-unused-state': 'error',
        // will introduced after the other warns are fixed
        // 'react/sort-comp': 'error',
        'react/void-dom-elements-no-children': 'error',
        'react/jsx-no-comment-textnodes': 'error',
        'react/jsx-no-literals': 'error',
        'react/jsx-no-target-blank': 'error',
        'react/jsx-fragments': 'error',
        'react/jsx-sort-default-props': 'error',
        // might be introduced after the other warns are fixed
        // 'react/jsx-sort-props': 'error',
        // might be introduced after the other warns are fixed
        'react-hooks/exhaustive-deps': 'off',
        'require-atomic-updates': 'error',
        'symbol-description': 'error',
        'vars-on-top': 'error',
      },
    },

    /**
     * Lists overrides
     */
    {
      // typescript and javascript for front and back end
      files: ['x-pack/plugins/lists/**/*.{js,ts,tsx}'],
      plugins: ['eslint-plugin-node'],
      env: {
        mocha: true,
        jest: true,
      },
      rules: {
        'accessor-pairs': 'error',
        'array-callback-return': 'error',
        'no-array-constructor': 'error',
        complexity: 'error',
        'consistent-return': 'error',
        'func-style': ['error', 'expression'],
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
            'newlines-between': 'always',
          },
        ],
        'sort-imports': [
          'error',
          {
            ignoreDeclarationSort: true,
          },
        ],
        'node/no-deprecated-api': 'error',
        'no-bitwise': 'error',
        'no-continue': 'error',
        'no-dupe-keys': 'error',
        'no-duplicate-case': 'error',
        'no-duplicate-imports': 'error',
        'no-empty-character-class': 'error',
        'no-empty-pattern': 'error',
        'no-ex-assign': 'error',
        'no-extend-native': 'error',
        'no-extra-bind': 'error',
        'no-extra-boolean-cast': 'error',
        'no-extra-label': 'error',
        'no-func-assign': 'error',
        'no-implicit-globals': 'error',
        'no-implied-eval': 'error',
        'no-invalid-regexp': 'error',
        'no-inner-declarations': 'error',
        'no-lone-blocks': 'error',
        'no-multi-assign': 'error',
        'no-misleading-character-class': 'error',
        'no-new-symbol': 'error',
        'no-obj-calls': 'error',
        'no-param-reassign': ['error', { props: true }],
        'no-process-exit': 'error',
        'no-prototype-builtins': 'error',
        'no-return-await': 'error',
        'no-self-compare': 'error',
        'no-shadow-restricted-names': 'error',
        'no-sparse-arrays': 'error',
        'no-this-before-super': 'error',
        'no-undef': 'error',
        'no-unreachable': 'error',
        'no-unsafe-finally': 'error',
        'no-useless-call': 'error',
        'no-useless-catch': 'error',
        'no-useless-concat': 'error',
        'no-useless-computed-key': 'error',
        'no-useless-escape': 'error',
        'no-useless-rename': 'error',
        'no-useless-return': 'error',
        'no-void': 'error',
        'one-var-declaration-per-line': 'error',
        'prefer-object-spread': 'error',
        'prefer-promise-reject-errors': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'prefer-template': 'error',
        'require-atomic-updates': 'error',
        'symbol-description': 'error',
        'vars-on-top': 'error',
        '@typescript-eslint/explicit-member-accessibility': 'error',
        '@typescript-eslint/no-this-alias': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-useless-constructor': 'error',
        '@typescript-eslint/unified-signatures': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        'no-template-curly-in-string': 'error',
        'sort-keys': 'error',
        'prefer-destructuring': 'error',
      },
    },
    /**
     * Alerting Services overrides
     */
    {
      // typescript only for front and back end
      files: [
        'x-pack/{,legacy/}plugins/{alerting,alerting_builtins,actions,task_manager,event_log}/**/*.{ts,tsx}',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },

    /**
     * Lens overrides
     */
    {
      files: ['x-pack/plugins/lens/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },

    /**
     * disable jsx-a11y for kbn-ui-framework
     */
    {
      files: ['packages/kbn-ui-framework/**/*.js'],
      rules: {
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/anchor-has-content': 'off',
        'jsx-a11y/tabindex-no-positive': 'off',
        'jsx-a11y/label-has-associated-control': 'off',
        'jsx-a11y/aria-role': 'off',
      },
    },

    /**
     * Canvas overrides
     */
    {
      files: ['x-pack/plugins/canvas/**/*.js'],
      rules: {
        radix: 'error',

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
        'x-pack/plugins/canvas/__tests__/**/*.js',
        'x-pack/plugins/canvas/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__}/**/*.js',
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
      files: ['x-pack/plugins/canvas/canvas_plugin_src/**/*.js'],
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
      files: ['x-pack/plugins/canvas/public/**/*.js'],
      env: {
        browser: true,
      },
    },
    {
      files: ['x-pack/plugins/canvas/canvas_plugin_src/lib/flot-charts/**/*.js'],
      env: {
        jquery: true,
      },
    },
    {
      files: ['x-pack/plugins/monitoring/public/lib/jquery_flot/**/*.js'],
      env: {
        jquery: true,
      },
    },

    /**
     * TSVB overrides
     */
    {
      files: [
        'src/plugins/vis_type_timeseries/**/*.{js,ts,tsx}',
        'src/legacy/core_plugins/vis_type_timeseries/**/*.{js,ts,tsx}',
      ],
      rules: {
        'import/no-default-export': 'error',
      },
    },

    /**
     * Prettier disables all conflicting rules, listing as last override so it takes precedence
     */
    {
      files: ['**/*'],
      rules: {
        ...require('eslint-config-prettier').rules,
        ...require('eslint-config-prettier/react').rules,
        ...require('eslint-config-prettier/@typescript-eslint').rules,
      },
    },
  ],
};
