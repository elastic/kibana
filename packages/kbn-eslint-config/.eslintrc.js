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

module.exports = {
  extends: ['./javascript.js', './typescript.js', './jest.js', './react.js'],

  plugins: [
    '@kbn/eslint-plugin-disable',
    '@kbn/eslint-plugin-eslint',
    '@kbn/eslint-plugin-imports',
    '@kbn/eslint-plugin-telemetry',
    '@kbn/eslint-plugin-i18n',
    '@kbn/eslint-plugin-alerting-v2',
    '@kbn/eslint-plugin-kbn-ui',
    // `@elastic/eui/*` and `depend/*` rules run in oxlint (.oxlint/eui.mts, .oxlint/depend.mts).
    // The plugins stay registered so `eslint-disable` directives naming their rules resolve.
    '@elastic/eui',
    'eslint-plugin-depend',
    'prettier',
  ],

  parserOptions: {
    ecmaVersion: 2018,
  },

  env: {
    es6: true,
  },

  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
  },
};
