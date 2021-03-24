/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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

const OLD_DUAL_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
`;

const DUAL_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
`;

const OLD_ELASTIC_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
`;

const ELASTIC_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
`;

const SAFER_LODASH_SET_HEADER = `
/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See \`packages/elastic-safer-lodash-set/LICENSE\` for more information.
 */
`;

const SAFER_LODASH_SET_LODASH_HEADER = `
/*
 * This file is forked from the lodash project (https://lodash.com/),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See \`packages/elastic-safer-lodash-set/LICENSE\` for more information.
 */
`;

const SAFER_LODASH_SET_DEFINITELYTYPED_HEADER = `
/*
 * This file is forked from the DefinitelyTyped project (https://github.com/DefinitelyTyped/DefinitelyTyped),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See \`packages/elastic-safer-lodash-set/LICENSE\` for more information.
 */
`;

module.exports = {
  root: true,

  extends: ['@elastic/eslint-config-kibana', 'plugin:@elastic/eui/recommended'],

  overrides: [
    /**
     * Temporarily disable some react rules for specific plugins, remove in separate PRs
     */
    {
      files: ['src/plugins/kibana_react/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'react-hooks/rules-of-hooks': 'off',
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: ['src/plugins/kibana_utils/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: ['x-pack/plugins/canvas/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'jsx-a11y/click-events-have-key-events': 'off',
      },
    },
    {
      files: ['x-pack/plugins/cross_cluster_replication/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'jsx-a11y/click-events-have-key-events': 'off',
      },
    },
    {
      files: ['x-pack/plugins/ml/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },

    /**
     * Files that require dual-license headers, settings
     * are overridden below for files that require Elastic
     * Licence headers
     */
    {
      files: [
        '**/*.{js,mjs,ts,tsx}',
        '!plugins/**/*',
        '!packages/elastic-datemath/**/*',
        '!packages/elastic-eslint-config-kibana/**/*',
      ],
      rules: {
        '@kbn/eslint/require-license-header': [
          'error',
          {
            license: DUAL_LICENSE_HEADER,
          },
        ],
        '@kbn/eslint/disallow-license-headers': [
          'error',
          {
            licenses: [
              APACHE_2_0_LICENSE_HEADER,
              ELASTIC_LICENSE_HEADER,
              OLD_DUAL_LICENSE_HEADER,
              OLD_ELASTIC_LICENSE_HEADER,
              SAFER_LODASH_SET_HEADER,
              SAFER_LODASH_SET_LODASH_HEADER,
              SAFER_LODASH_SET_DEFINITELYTYPED_HEADER,
            ],
          },
        ],
      },
    },

    /**
     * Files that require Apache headers
     */
    {
      files: [
        'packages/elastic-datemath/**/*.{js,mjs,ts,tsx}',
        'packages/elastic-eslint-config-kibana/**/*.{js,mjs,ts,tsx}',
      ],
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
            licenses: [
              DUAL_LICENSE_HEADER,
              ELASTIC_LICENSE_HEADER,
              OLD_DUAL_LICENSE_HEADER,
              OLD_ELASTIC_LICENSE_HEADER,
              SAFER_LODASH_SET_HEADER,
              SAFER_LODASH_SET_LODASH_HEADER,
              SAFER_LODASH_SET_DEFINITELYTYPED_HEADER,
            ],
          },
        ],
      },
    },

    /**
     * New Platform client-side
     */
    {
      files: ['{src,x-pack}/plugins/*/public/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'import/no-commonjs': 'error',
      },
    },

    /**
     * Files that require Elastic license headers instead of dual-license header
     */
    {
      files: ['x-pack/**/*.{js,mjs,ts,tsx}'],
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
            licenses: [
              APACHE_2_0_LICENSE_HEADER,
              DUAL_LICENSE_HEADER,
              OLD_DUAL_LICENSE_HEADER,
              OLD_ELASTIC_LICENSE_HEADER,
              SAFER_LODASH_SET_HEADER,
              SAFER_LODASH_SET_LODASH_HEADER,
              SAFER_LODASH_SET_DEFINITELYTYPED_HEADER,
            ],
          },
        ],
      },
    },

    /**
     * safer-lodash-set package requires special license headers
     */
    {
      files: ['packages/elastic-safer-lodash-set/**/*.{js,mjs,ts,tsx}'],
      rules: {
        '@kbn/eslint/require-license-header': [
          'error',
          {
            license: SAFER_LODASH_SET_LODASH_HEADER,
          },
        ],
        '@kbn/eslint/disallow-license-headers': [
          'error',
          {
            licenses: [
              APACHE_2_0_LICENSE_HEADER,
              DUAL_LICENSE_HEADER,
              ELASTIC_LICENSE_HEADER,
              OLD_DUAL_LICENSE_HEADER,
              OLD_ELASTIC_LICENSE_HEADER,
              SAFER_LODASH_SET_HEADER,
              SAFER_LODASH_SET_DEFINITELYTYPED_HEADER,
            ],
          },
        ],
      },
    },
    {
      files: ['packages/elastic-safer-lodash-set/test/*.{js,mjs,ts,tsx}'],
      rules: {
        '@kbn/eslint/require-license-header': [
          'error',
          {
            license: SAFER_LODASH_SET_HEADER,
          },
        ],
        '@kbn/eslint/disallow-license-headers': [
          'error',
          {
            licenses: [
              APACHE_2_0_LICENSE_HEADER,
              DUAL_LICENSE_HEADER,
              ELASTIC_LICENSE_HEADER,
              OLD_DUAL_LICENSE_HEADER,
              OLD_ELASTIC_LICENSE_HEADER,
              SAFER_LODASH_SET_LODASH_HEADER,
              SAFER_LODASH_SET_DEFINITELYTYPED_HEADER,
            ],
          },
        ],
      },
    },
    {
      files: ['packages/elastic-safer-lodash-set/**/*.d.ts'],
      rules: {
        '@kbn/eslint/require-license-header': [
          'error',
          {
            license: SAFER_LODASH_SET_DEFINITELYTYPED_HEADER,
          },
        ],
        '@kbn/eslint/disallow-license-headers': [
          'error',
          {
            licenses: [
              APACHE_2_0_LICENSE_HEADER,
              DUAL_LICENSE_HEADER,
              ELASTIC_LICENSE_HEADER,
              OLD_ELASTIC_LICENSE_HEADER,
              OLD_DUAL_LICENSE_HEADER,
              SAFER_LODASH_SET_HEADER,
              SAFER_LODASH_SET_LODASH_HEADER,
            ],
          },
        ],
      },
    },

    /**
     * Restricted paths
     */
    {
      files: ['**/*.{js,mjs,ts,tsx}'],
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
                target: ['(src|x-pack)/plugins/*/server/**/*'],
                from: ['(src|x-pack)/plugins/*/public/**/*'],
                errorMessage: `Server code can not import from public, use a common directory.`,
              },
              {
                target: ['(src|x-pack)/plugins/*/common/**/*'],
                from: ['(src|x-pack)/plugins/*/(server|public)/**/*'],
                errorMessage: `Common code can not import from server or public, use a common directory.`,
              },
              {
                target: [
                  'src/legacy/**/*',
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
                  '!src/core/server/test_utils{,.ts}',
                  '!src/core/server/utils', // ts alias
                  '!src/core/server/utils/**/*',
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
                  'src/legacy/**/*',
                  '(src|x-pack)/plugins/**/(public|server)/**/*',
                  'examples/**/*',
                  '!(src|x-pack)/**/*.test.*',
                  '!(x-pack/)?test/**/*',
                ],
                from: [
                  '(src|x-pack)/plugins/**/(public|server)/**/*',
                  '!(src|x-pack)/plugins/**/(public|server)/mocks/index.{js,mjs,ts}',
                  '!(src|x-pack)/plugins/**/(public|server)/(index|mocks).{js,mjs,ts,tsx}',
                ],
                allowSameFolder: true,
                errorMessage: 'Plugins may only import from top-level public and server modules.',
              },
              {
                target: [
                  '(src|x-pack)/plugins/**/*',
                  '!(src|x-pack)/plugins/**/server/**/*',

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
                from: ['plugins/**/*', 'src/plugins/**/*', 'src/legacy/ui/**/*'],
                errorMessage: 'The core cannot depend on any plugins.',
              },
              {
                target: ['(src|x-pack)/plugins/*/public/**/*'],
                from: ['ui/**/*'],
                errorMessage: 'Plugins cannot import legacy UI code.',
              },
              {
                from: ['src/legacy/ui/**/*', 'ui/**/*'],
                target: [
                  'test/plugin_functional/plugins/**/public/np_ready/**/*',
                  'test/plugin_functional/plugins/**/server/np_ready/**/*',
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
        '**/*.stories.tsx',
        'x-pack/test/apm_api_integration/**/*.ts',
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
        'src/fixtures/**/*.js', // TODO: this directory needs to be more obviously "public" (or go away)
      ],
      settings: {
        // instructs import/no-extraneous-dependencies to treat certain modules
        // as core modules, even if they aren't listed in package.json
        'import/core-modules': ['plugins'],

        'import/resolver': {
          '@kbn/eslint-import-resolver-kibana': {
            forceNode: false,
            rootPackageName: 'kibana',
            kibanaPath: '.',
            pluginMap: {},
          },
        },
      },
    },

    /**
     * Files that ARE NOT allowed to use devDependencies
     */
    {
      files: ['x-pack/**/*.js', 'packages/kbn-interpreter/**/*.js'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: false,
            peerDependencies: true,
            packageDir: '.',
          },
        ],
      },
    },

    /**
     * Files that ARE allowed to use devDependencies
     */
    {
      files: [
        'packages/kbn-es/src/**/*.js',
        'packages/kbn-interpreter/tasks/**/*.js',
        'packages/kbn-interpreter/src/plugin/**/*.js',
        'x-pack/{dev-tools,tasks,scripts,test,build_chromium}/**/*.js',
        'x-pack/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__,public}/**/*.js',
        'x-pack/**/*.test.js',
        'x-pack/test_utils/**/*',
        'x-pack/gulpfile.js',
        'x-pack/plugins/apm/public/utils/testHelpers.js',
        'x-pack/plugins/canvas/shareable_runtime/postcss.config.js',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            peerDependencies: true,
            packageDir: '.',
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
        'packages/kbn-eslint-import-resolver-kibana/**/*.js',
        'packages/kbn-eslint-plugin-eslint/**/*',
        'x-pack/gulpfile.js',
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
      files: ['**/*.test.{js,mjs,ts,tsx}'],
      rules: {
        'jest/valid-describe': 'error',
      },
    },

    /**
     * Harden specific rules
     */
    {
      files: ['test/harden/*.js', 'packages/elastic-safer-lodash-set/test/*.js'],
      rules: {
        'mocha/handle-done-callback': 'off',
      },
    },
    {
      files: ['**/*.{js,mjs,ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          2,
          {
            paths: [
              {
                name: 'lodash',
                importNames: ['set', 'setWith'],
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash.set',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash.setwith',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/set',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/setWith',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/fp',
                importNames: ['set', 'setWith', 'assoc', 'assocPath'],
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/fp/set',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/fp/setWith',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/fp/assoc',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/fp/assocPath',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'react-use',
                message: 'Please use react-use/lib/{method} instead.',
              },
            ],
          },
        ],
        'no-restricted-modules': [
          2,
          {
            paths: [
              {
                name: 'lodash.set',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash.setwith',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/set',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
              {
                name: 'lodash/setWith',
                message: 'Please use @elastic/safer-lodash-set instead',
              },
            ],
          },
        ],
        'no-restricted-properties': [
          2,
          {
            object: 'lodash',
            property: 'set',
            message: 'Please use @elastic/safer-lodash-set instead',
          },
          {
            object: '_',
            property: 'set',
            message: 'Please use @elastic/safer-lodash-set instead',
          },
          {
            object: 'lodash',
            property: 'setWith',
            message: 'Please use @elastic/safer-lodash-set instead',
          },
          {
            object: '_',
            property: 'setWith',
            message: 'Please use @elastic/safer-lodash-set instead',
          },
          {
            object: 'lodash',
            property: 'assoc',
            message: 'Please use @elastic/safer-lodash-set instead',
          },
          {
            object: '_',
            property: 'assoc',
            message: 'Please use @elastic/safer-lodash-set instead',
          },
          {
            object: 'lodash',
            property: 'assocPath',
            message: 'Please use @elastic/safer-lodash-set instead',
          },
          {
            object: '_',
            property: 'assocPath',
            message: 'Please use @elastic/safer-lodash-set instead',
          },
        ],
      },
    },

    /**
     * APM and Observability overrides
     */
    {
      files: [
        'x-pack/plugins/apm/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/observability/**/*.{js,mjs,ts,tsx}',
      ],
      rules: {
        'no-console': ['warn', { allow: ['error'] }],
        'react/function-component-definition': [
          'warn',
          {
            namedComponents: 'function-declaration',
            unnamedComponents: 'arrow-function',
          },
        ],
        'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
        'react-hooks/exhaustive-deps': ['error', { additionalHooks: '^useFetcher$' }],
      },
    },

    /**
     * Fleet overrides
     */
    {
      files: ['x-pack/plugins/fleet/**/*.{js,mjs,ts,tsx}'],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        'import/order': [
          'warn',
          {
            groups: ['builtin', 'external', 'internal', 'parent'],
            'newlines-between': 'always-and-inside-groups',
          },
        ],
      },
    },

    /**
     * Security Solution overrides
     */
    {
      // front end and common typescript and javascript files only
      files: [
        'x-pack/plugins/security_solution/public/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/security_solution/common/**/*.{js,mjs,ts,tsx}',
      ],
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
      files: ['x-pack/plugins/security_solution/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-this-alias': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-useless-constructor': 'error',
        '@typescript-eslint/unified-signatures': 'error',
      },
    },
    {
      // typescript and javascript for front and back end
      files: ['x-pack/plugins/security_solution/**/*.{js,mjs,ts,tsx}'],
      plugins: ['eslint-plugin-node', 'react'],
      env: {
        jest: true,
      },
      rules: {
        'accessor-pairs': 'error',
        'array-callback-return': 'error',
        'no-array-constructor': 'error',
        complexity: 'warn',
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
        // rely on typescript
        'no-undef': 'off',
        'no-unreachable': 'error',
        'no-unsafe-finally': 'error',
        'no-useless-call': 'error',
        'no-useless-catch': 'error',
        'no-useless-concat': 'error',
        'no-useless-computed-key': 'error',
        'no-useless-rename': 'error',
        'no-useless-return': 'error',
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
        'react/void-dom-elements-no-children': 'error',
        'react/jsx-no-comment-textnodes': 'error',
        'react/jsx-no-literals': 'error',
        'react/jsx-no-target-blank': 'error',
        'react/jsx-fragments': 'error',
        'react/jsx-sort-default-props': 'error',
        'require-atomic-updates': 'error',
        'symbol-description': 'error',
        'vars-on-top': 'error',
      },
    },

    /**
     * Lists overrides
     */
    {
      // front end and common typescript and javascript files only
      files: [
        'x-pack/plugins/lists/public/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/lists/common/**/*.{js,mjs,ts,tsx}',
      ],
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
      // typescript for /public and /common
      files: ['x-pack/plugins/lists/public/*.{ts,tsx}', 'x-pack/plugins/lists/common/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-for-in-array': 'error',
      },
    },
    {
      // typescript for /public and /common
      files: ['x-pack/plugins/lists/public/*.{ts,tsx}', 'x-pack/plugins/lists/common/*.{ts,tsx}'],
      plugins: ['react'],
      env: {
        jest: true,
      },
      rules: {
        'react/boolean-prop-naming': 'error',
        'react/button-has-type': 'error',
        'react/display-name': 'error',
        'react/forbid-dom-props': 'error',
        'react/no-access-state-in-setstate': 'error',
        'react/no-children-prop': 'error',
        'react/no-danger-with-children': 'error',
        'react/no-deprecated': 'error',
        'react/no-did-mount-set-state': 'error',
        'react/no-did-update-set-state': 'error',
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
        'react/sort-comp': 'error',
        'react/void-dom-elements-no-children': 'error',
        'react/jsx-no-comment-textnodes': 'error',
        'react/jsx-no-literals': 'error',
        'react/jsx-no-target-blank': 'error',
        'react/jsx-fragments': 'error',
        'react/jsx-sort-default-props': 'error',
      },
    },
    {
      files: ['x-pack/plugins/lists/public/**/!(*.test).{js,mjs,ts,tsx}'],
      plugins: ['react-perf'],
      rules: {
        'react-perf/jsx-no-new-object-as-prop': 'error',
        'react-perf/jsx-no-new-array-as-prop': 'error',
        'react-perf/jsx-no-new-function-as-prop': 'error',
        'react/jsx-no-bind': 'error',
      },
    },
    {
      // typescript and javascript for front and back
      files: ['x-pack/plugins/lists/**/*.{js,mjs,ts,tsx}'],
      plugins: ['eslint-plugin-node'],
      env: {
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
        // rely on typescript
        'no-undef': 'off',
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
      // typescript for front and back end
      files: [
        'x-pack/plugins/{alerting,stack_alerts,actions,task_manager,event_log}/**/*.{ts,tsx}',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
    {
      // typescript only for back end
      files: ['x-pack/plugins/triggers_actions_ui/server/**/*.ts'],
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
     * Enterprise Search overrides
     * NOTE: We also have a single rule at the bottom of the file that
     * overrides Prettier's default of not linting unnecessary backticks
     */
    {
      // All files
      files: ['x-pack/plugins/enterprise_search/**/*.{ts,tsx}'],
      rules: {
        'import/order': [
          'error',
          {
            groups: ['unknown', ['builtin', 'external'], 'internal', 'parent', 'sibling', 'index'],
            pathGroups: [
              {
                pattern:
                  '{../../../../../../,../../../../../,../../../../,../../../,../../,../}{common/,*}__mocks__{*,/**}',
                group: 'unknown',
              },
              {
                pattern: '{**,.}/*.mock',
                group: 'unknown',
              },
              {
                pattern: 'react*',
                group: 'external',
                position: 'before',
              },
              {
                pattern: '{@elastic/**,@kbn/**,src/**}',
                group: 'internal',
              },
            ],
            pathGroupsExcludedImportTypes: [],
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
            'newlines-between': 'always-and-inside-groups',
          },
        ],
        'import/newline-after-import': 'error',
        'react-hooks/exhaustive-deps': 'off',
        'react/jsx-boolean-value': ['error', 'never'],
      },
    },
    {
      // Source files only - allow `any` in test/mock files
      files: ['x-pack/plugins/enterprise_search/**/*.{ts,tsx}'],
      excludedFiles: ['x-pack/plugins/enterprise_search/**/*.{test,mock}.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
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
            packageDir: '.',
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
      files: ['packages/kbn-ui-shared-deps/flot_charts/**/*.js'],
      env: {
        jquery: true,
      },
    },

    /**
     * TSVB overrides
     */
    {
      files: ['src/plugins/vis_type_timeseries/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'import/no-default-export': 'error',
      },
    },

    /**
     * Osquery overrides
     */
    {
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      plugins: ['react', '@typescript-eslint'],
      files: ['x-pack/plugins/osquery/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'arrow-body-style': ['error', 'as-needed'],
        'prefer-arrow-callback': 'error',
        'no-unused-vars': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
    {
      // typescript and javascript for front end react performance
      files: ['x-pack/plugins/osquery/public/**/!(*.test).{js,mjs,ts,tsx}'],
      plugins: ['react', 'react-perf'],
      rules: {
        'react-perf/jsx-no-new-object-as-prop': 'error',
        'react-perf/jsx-no-new-array-as-prop': 'error',
        'react-perf/jsx-no-new-function-as-prop': 'error',
        'react/jsx-no-bind': 'error',
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
    /**
     * Enterprise Search Prettier override
     * Lints unnecessary backticks - @see https://github.com/prettier/eslint-config-prettier/blob/main/README.md#forbid-unnecessary-backticks
     */
    {
      files: ['x-pack/plugins/enterprise_search/**/*.{ts,tsx}'],
      rules: {
        quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
      },
    },

    /**
     * Platform Security Team overrides
     */
    {
      files: [
        'src/plugins/security_oss/**/*.{js,mjs,ts,tsx}',
        'src/plugins/spaces_oss/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/encrypted_saved_objects/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/security/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/spaces/**/*.{js,mjs,ts,tsx}',
      ],
      rules: {
        '@typescript-eslint/consistent-type-imports': 1,
        'import/order': [
          // This rule sorts import declarations
          'error',
          {
            groups: [
              'unknown',
              ['builtin', 'external'],
              'internal',
              ['parent', 'sibling', 'index'],
            ],
            pathGroups: [
              {
                pattern: '{@kbn/**,src/**,kibana{,/**}}',
                group: 'internal',
              },
            ],
            pathGroupsExcludedImportTypes: [],
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
            'newlines-between': 'always',
          },
        ],
        'import/no-duplicates': ['error'],
        'sort-imports': [
          // This rule sorts imports of multiple members (destructured imports)
          'error',
          {
            ignoreCase: true,
            ignoreDeclarationSort: true,
          },
        ],
      },
    },

    {
      files: [
        // core-team owned code
        'src/core/**',
        'x-pack/plugins/features/**',
        'x-pack/plugins/licensing/**',
        'x-pack/plugins/global_search/**',
        'x-pack/plugins/cloud/**',
        'packages/kbn-config-schema',
        'src/plugins/status_page/**',
        'src/plugins/saved_objects_management/**',
        'packages/kbn-analytics/**',
        'packages/kbn-telemetry-tools/**',
        'src/plugins/kibana_usage_collection/**',
        'src/plugins/usage_collection/**',
        'src/plugins/telemetry/**',
        'src/plugins/telemetry_collection_manager/**',
        'src/plugins/telemetry_management_section/**',
        'x-pack/plugins/telemetry_collection_xpack/**',
      ],
      rules: {
        '@typescript-eslint/prefer-ts-expect-error': 'error',
      },
    },
    {
      files: [
        '**/public/**/*.{js,mjs,ts,tsx}',
        '**/common/**/*.{js,mjs,ts,tsx}',
        'packages/**/*.{js,mjs,ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: ['lodash/*', '!lodash/fp', 'rxjs/internal-compatibility'],
          },
        ],
      },
    },

    /**
     * Single package.json rules, it tells eslint to ignore the child package.json files
     * and look for dependencies declarations in the single and root level package.json
     */
    {
      files: ['**/*.{js,mjs,ts,tsx}'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            packageDir: '.',
          },
        ],
      },
    },
  ],
};
