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


const semver = require('semver');
const { PKG_JSON } = require('@kbn/repo-info');

module.exports = {
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
  ],

  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },

  settings: {
    react: {
      version: semver.valid(semver.coerce(PKG_JSON.dependencies.react)),
    },
  },

  rules: {
    'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],
    'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
    'react-hooks/exhaustive-deps': 'error', // Checks effect dependencies
    'jsx-a11y/accessible-emoji': 'error',
    'react/prefer-stateless-function': ['error', { ignorePureComponents: true }],
  },
}
