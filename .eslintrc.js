/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');
const Fs = require('fs');

const globby = require('globby');

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

const packagePkgJsons = globby.sync('*/package.json', {
  cwd: Path.resolve(__dirname, 'packages'),
  absolute: true,
});

/** Packages which should not be included within production code. */
const DEV_PACKAGES = packagePkgJsons.flatMap((path) => {
  const pkg = JSON.parse(Fs.readFileSync(path, 'utf8'));
  return pkg.kibana && pkg.kibana.devOnly ? Path.dirname(Path.basename(path)) : [];
});

/** Directories (at any depth) which include dev-only code. */
const DEV_DIRECTORIES = [
  '.storybook',
  '__tests__',
  '__test__',
  '__jest__',
  '__fixtures__',
  '__mocks__',
  '__stories__',
  'e2e',
  'fixtures',
  'ftr_e2e',
  'integration_tests',
  'manual_tests',
  'mock',
  'storybook',
  'scripts',
  'test',
  'test-d',
  'test_utils',
  'test_utilities',
  'test_helpers',
  'tests_client_integration',
];

/** File patterns for dev-only code. */
const DEV_FILE_PATTERNS = [
  '*.mock.{js,ts,tsx}',
  '*.test.{js,ts,tsx}',
  '*.test.helpers.{js,ts,tsx}',
  '*.stories.{js,ts,tsx}',
  '*.story.{js,ts,tsx}',
  '*.stub.{js,ts,tsx}',
  'mock.{js,ts,tsx}',
  '_stubs.{js,ts,tsx}',
  '{testHelpers,test_helper,test_utils}.{js,ts,tsx}',
  '{postcss,webpack}.config.js',
];

/** Glob patterns which describe dev-only code. */
const DEV_PATTERNS = [
  ...DEV_PACKAGES.map((pkg) => `packages/${pkg}/**/*`),
  ...DEV_DIRECTORIES.map((dir) => `{packages,src,x-pack}/**/${dir}/**/*`),
  ...DEV_FILE_PATTERNS.map((file) => `{packages,src,x-pack}/**/${file}`),
  'packages/kbn-interpreter/tasks/**/*',
  'src/dev/**/*',
  'x-pack/{dev-tools,tasks,scripts,test,build_chromium}/**/*',
  'x-pack/plugins/*/server/scripts/**/*',
];

/** Restricted imports with suggested alternatives */
const RESTRICTED_IMPORTS = [
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
    name: 'lodash',
    importNames: ['template'],
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash.template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/fp',
    importNames: ['template'],
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/fp/template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'react-use',
    message: 'Please use react-use/lib/{method} instead.',
  },
];

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
      files: ['**/*.{js,mjs,ts,tsx}'],
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
                target: ['(src|x-pack)/plugins/**/(public|server)/**/*', 'examples/**/*'],
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
                  '(src|x-pack)/plugins/**/(public|server)/**/*',
                  'examples/**/*',
                  '!(src|x-pack)/**/*.test.*',
                  '!(x-pack/)?test/**/*',
                ],
                from: [
                  '(src|x-pack)/plugins/**/(public|server)/**/*',
                  '!(src|x-pack)/plugins/**/(public|server)/mocks/index.{js,mjs,ts}',
                  '!(src|x-pack)/plugins/**/(public|server)/(index|mocks).{js,mjs,ts,tsx}',
                  '!(src|x-pack)/plugins/**/__stories__/index.{js,mjs,ts,tsx}',
                  '!(src|x-pack)/plugins/**/__fixtures__/index.{js,mjs,ts,tsx}',
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
                target: ['src/core/**/*'],
                from: ['plugins/**/*', 'src/plugins/**/*'],
                errorMessage: 'The core cannot depend on any plugins.',
              },
              {
                target: ['(src|x-pack)/plugins/*/public/**/*'],
                from: ['ui/**/*'],
                errorMessage: 'Plugins cannot import legacy UI code.',
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
        '**/*.test.js',
        'x-pack/test/apm_api_integration/**/*.ts',
        'x-pack/test/functional/apps/**/*.js',
        'x-pack/plugins/apm/**/*.js',
        'test/*/config.ts',
        'test/*/config_open.ts',
        'test/*/*.config.ts',
        'test/*/{tests,test_suites,apis,apps}/**/*',
        'test/visual_regression/tests/**/*',
        'x-pack/test/*/{tests,test_suites,apis,apps}/**/*',
        'x-pack/test/*/*config.*ts',
        'x-pack/test/saved_object_api_integration/*/apis/**/*',
        'x-pack/test/ui_capabilities/*/tests/**/*',
      ],
      rules: {
        'import/no-default-export': 'off',
        'import/no-named-as-default-member': 'off',
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
     * Single package.json rules, it tells eslint to ignore the child package.json files
     * and look for dependencies declarations in the single and root level package.json
     */
    {
      files: ['{src,x-pack,packages}/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            /* Files that ARE allowed to use devDependencies */
            devDependencies: [...DEV_PATTERNS],
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
        '**/jest.config.js',
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
            paths: RESTRICTED_IMPORTS,
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
                name: 'lodash.template',
                message:
                  'lodash.template is unsafe, and not compatible with our content security policy.',
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
                name: 'lodash/template',
                message:
                  'lodash.template is unsafe, and not compatible with our content security policy.',
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
            property: 'template',
            message:
              'lodash.template is unsafe, and not compatible with our content security policy.',
          },
          {
            object: '_',
            property: 'template',
            message:
              'lodash.template is unsafe, and not compatible with our content security policy.',
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
    {
      files: ['**/common/**/*.{js,mjs,ts,tsx}', '**/public/**/*.{js,mjs,ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          2,
          {
            paths: [
              ...RESTRICTED_IMPORTS,
              {
                name: 'semver',
                message: 'Please use "semver/*/{function}" instead',
              },
            ],
          },
        ],
      },
    },

    /**
     * APM, UX and Observability overrides
     */
    {
      files: [
        'x-pack/plugins/apm/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/observability/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/ux/**/*.{js,mjs,ts,tsx}',
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
    {
      files: ['x-pack/plugins/apm/**/*.stories.*', 'x-pack/plugins/observability/**/*.stories.*'],
      rules: {
        'react/function-component-definition': [
          'off',
          {
            namedComponents: 'function-declaration',
            unnamedComponents: 'arrow-function',
          },
        ],
      },
    },
    {
      // require explicit return types in route handlers for performance reasons
      files: ['x-pack/plugins/apm/server/**/route.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': [
          'error',
          {
            allowTypedFunctionExpressions: false,
          },
        ],
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
     * Security Solution overrides. These rules below are maintained and owned by
     * the people within the security-solution-platform team. Please see ping them
     * or check with them if you are encountering issues, have suggestions, or would
     * like to add, change, or remove any particular rule. Linters, Typescript, and rules
     * evolve and change over time just like coding styles, so please do not hesitate to
     * reach out.
     */
    {
      // front end and common typescript and javascript files only
      files: [
        'x-pack/plugins/security_solution/public/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/security_solution/common/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/timelines/public/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/timelines/common/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/cases/public/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/cases/common/**/*.{js,mjs,ts,tsx}',
      ],
      rules: {
        'import/no-nodejs-modules': 'error',
        'no-duplicate-imports': 'off',
        '@typescript-eslint/no-duplicate-imports': ['error'],
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
      // typescript only for front and back end, but excludes the test files.
      // We use this section to add rules in which we do not want to apply to test files.
      // This should be a very small set as most linter rules are useful for tests as well.
      files: [
        'x-pack/plugins/security_solution/**/*.{ts,tsx}',
        'x-pack/plugins/timelines/**/*.{ts,tsx}',
        'x-pack/plugins/cases/**/*.{ts,tsx}',
      ],
      excludedFiles: [
        'x-pack/plugins/security_solution/**/*.{test,mock,test_helper}.{ts,tsx}',
        'x-pack/plugins/timelines/**/*.{test,mock,test_helper}.{ts,tsx}',
        'x-pack/plugins/cases/**/*.{test,mock,test_helper}.{ts,tsx}',
      ],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'error',
      },
    },
    {
      // typescript only for front and back end
      files: [
        'x-pack/plugins/security_solution/**/*.{ts,tsx}',
        'x-pack/plugins/timelines/**/*.{ts,tsx}',
        'x-pack/plugins/cases/**/*.{ts,tsx}',
      ],
      rules: {
        '@typescript-eslint/no-this-alias': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-useless-constructor': 'error',
        '@typescript-eslint/unified-signatures': 'error',
        'no-restricted-imports': [
          'error',
          {
            // prevents code from importing files that contain the name "legacy" within their name. This is a mechanism
            // to help deprecation and prevent accidental re-use/continued use of code we plan on removing. If you are
            // finding yourself turning this off a lot for "new code" consider renaming the file and functions if it is has valid uses.
            patterns: ['*legacy*'],
          },
        ],
      },
    },
    {
      // typescript and javascript for front and back end
      files: [
        'x-pack/plugins/security_solution/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/timelines/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/cases/**/*.{js,mjs,ts,tsx}',
      ],
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
        'no-duplicate-imports': 'off',
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
        '@typescript-eslint/no-duplicate-imports': ['error'],
      },
    },
    {
      files: ['x-pack/plugins/cases/public/**/*.{js,mjs,ts,tsx}'],
      excludedFiles: ['x-pack/plugins/cases/**/*.{test,mock,test_helper}.{ts,tsx}'],
      rules: {
        'react/display-name': ['error', { ignoreTranspilerName: true }],
      },
    },

    /**
     * Lists overrides. These rules below are maintained and owned by
     * the people within the security-solution-platform team. Please see ping them
     * or check with them if you are encountering issues, have suggestions, or would
     * like to add, change, or remove any particular rule. Linters, Typescript, and rules
     * evolve and change over time just like coding styles, so please do not hesitate to
     * reach out.
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
        'no-restricted-imports': [
          'error',
          {
            // prevents code from importing files that contain the name "legacy" within their name. This is a mechanism
            // to help deprecation and prevent accidental re-use/continued use of code we plan on removing. If you are
            // finding yourself turning this off a lot for "new code" consider renaming the file and functions if it has valid uses.
            patterns: ['*legacy*'],
          },
        ],
      },
    },

    /**
     * Metrics entities overrides. These rules below are maintained and owned by
     * the people within the security-solution-platform team. Please see ping them
     * or check with them if you are encountering issues, have suggestions, or would
     * like to add, change, or remove any particular rule. Linters, Typescript, and rules
     * evolve and change over time just like coding styles, so please do not hesitate to
     * reach out.
     */
    {
      // front end and common typescript and javascript files only
      files: [
        'x-pack/plugins/metrics_entities/public/**/*.{js,mjs,ts,tsx}',
        'x-pack/plugins/metrics_entities/common/**/*.{js,mjs,ts,tsx}',
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
      // typescript and javascript for front and back end
      files: ['x-pack/plugins/metrics_entities/**/*.{js,mjs,ts,tsx}'],
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
        'no-restricted-imports': [
          'error',
          {
            // prevents code from importing files that contain the name "legacy" within their name. This is a mechanism
            // to help deprecation and prevent accidental re-use/continued use of code we plan on removing. If you are
            // finding yourself turning this off a lot for "new code" consider renaming the file and functions if it has valid uses.
            patterns: ['*legacy*'],
          },
        ],
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
     * Discover overrides
     */
    {
      files: ['src/plugins/discover/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/ban-ts-comment': [
          'error',
          {
            'ts-expect-error': false,
          },
        ],
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
                  '{../../../../../../,../../../../../,../../../../,../../../,../../,../,./}{common/,*}__mocks__{*,/**}',
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
        '@typescript-eslint/no-unused-vars': [
          'error',
          { vars: 'all', args: 'after-used', ignoreRestSiblings: true, varsIgnorePattern: '^_' },
        ],
      },
    },
    {
      // Source files only - allow `any` in test/mock files
      files: ['x-pack/plugins/enterprise_search/**/*.{ts,tsx}'],
      excludedFiles: ['x-pack/plugins/enterprise_search/**/*.{test,mock,test_helper}.{ts,tsx}'],
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
      files: ['packages/kbn-flot-charts/lib/**/*.js'],
      env: {
        jquery: true,
      },
    },

    /**
     * TSVB overrides
     */
    {
      files: ['src/plugins/vis_types/timeseries/**/*.{js,mjs,ts,tsx}'],
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
     * Platform Security Team overrides
     */
    {
      files: [
        'src/plugins/interactive_setup/**/*.{js,mjs,ts,tsx}',
        'test/interactive_setup_api_integration/**/*.{js,mjs,ts,tsx}',
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
                pattern: '{**,.}/*.test.mocks',
                group: 'unknown',
              },
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

    /**
     * Do not allow `any`
     */
    {
      files: [
        'packages/kbn-analytics/**',
        // 'packages/kbn-telemetry-tools/**',
        'src/plugins/kibana_usage_collection/**',
        'src/plugins/usage_collection/**',
        'src/plugins/telemetry/**',
        'src/plugins/telemetry_collection_manager/**',
        'src/plugins/telemetry_management_section/**',
        'x-pack/plugins/telemetry_collection_xpack/**',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
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

    /**
     * Disallow `export *` syntax in plugin/core public/server/common index files and instead
     * require that plugins/core explicitly export the APIs that should be accessible outside the plugin.
     *
     * To add your plugin to this list just update the relevant glob with the name of your plugin
     */
    {
      files: [
        'src/core/{server,public,common}/index.ts',
        'src/plugins/*/{server,public,common}/index.ts',
        'src/plugins/*/*/{server,public,common}/index.ts',
        'x-pack/plugins/*/{server,public,common}/index.ts',
        'x-pack/plugins/*/*/{server,public,common}/index.ts',
      ],
      rules: {
        '@kbn/eslint/no_export_all': 'error',
      },
    },

    {
      files: ['packages/kbn-type-summarizer/**/*.ts'],
      rules: {
        'no-bitwise': 'off',
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
  ],
};
