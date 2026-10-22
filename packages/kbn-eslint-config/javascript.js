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

const RESTRICTED_MODULES = { paths: ['gulp-util'] };

module.exports = {
  overrides: [
    /**
     * Main JS configuration
     */
    {
      files: ['**/*.js', '**/*.mjs'],
      parser: require.resolve('@babel/eslint-parser'),

      plugins: [
        'mocha',
        'import',
        'no-unsanitized',
      ],

      env: {
        es6: true,
        node: true,
        mocha: true,
        browser: true,
      },

      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2018,
        requireConfigFile: false,
        babelOptions: {
          presets: ['@kbn/babel-preset/node_preset'],
          parserOpts: {
            plugins: ['importAttributes']
          }
        },
      },

      rules: {
        camelcase: [ 'error', { properties: 'never', allow: ['^UNSAFE_'] } ],
        'consistent-return': 'off',
        'no-multi-str': 'off',
        'no-new': 'off',
        'no-path-concat': 'off',
        'no-restricted-imports': [2, RESTRICTED_MODULES],
        'no-restricted-modules': [2, RESTRICTED_MODULES],
        'no-return-assign': 'off',
        'no-shadow': 'off',
        'no-undef': 'error',
        'no-underscore-dangle': 'off',
        'no-unsanitized/method': 'error',
        'no-unsanitized/property': 'error',
        'no-unused-expressions': 'off',
        strict: [ 'error', 'never' ],
        yoda: 'off',

        'mocha/handle-done-callback': 'error',
        'mocha/no-exclusive-tests': 'error',
      }
    },
  ]
};
