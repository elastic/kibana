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
  extends: [
    './javascript.js',
    './typescript.js',
    './jest.js',
  ],
  plugins: ['@kbn/eslint-plugin-eslint'],

  overrides: [
    /**
     * Prettier
     */
    {
      files: [
        '.eslintrc.js',
        'packages/kbn-eslint-plugin-eslint/**/*',
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
        'src/legacy/server/saved_objects/**/*',
        'x-pack/plugins/apm/**/*',
        'x-pack/plugins/canvas/**/*',
        '**/*.{ts,tsx}',
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
     * Files that require Apache 2.0 headers, settings
     * are overridden below for files that require Elastic
     * Licence headers
     */
    {
      files: ['**/*.{js,ts,tsx}'],
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
        '@kbn/eslint/module_migration': [
          'error',
          [
            {
              from: 'expect.js',
              to: '@kbn/expect',
            },
            {
              from: 'x-pack',
              toRelative: 'x-pack',
            },
          ],
        ],
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
  ],
};
