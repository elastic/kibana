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

const path = require('path')

function buildRestrictedPaths(shimmedPlugins) {
  return shimmedPlugins.map(shimmedPlugin => ({
    target: [
      `public/${shimmedPlugin}/**/*`,
      `!public/${shimmedPlugin}/kibana_services.ts`,
      `!public/${shimmedPlugin}/legacy_imports.ts`,
      `!public/${shimmedPlugin}/**/__tests__/**/*`,
      `!public/${shimmedPlugin}/index.ts`,
    ],
    from: [
      'ui/**/*',
      'public/**/*',
      `!public/${shimmedPlugin}/**/*`,
    ],
    allowSameFolder: false,
    errorMessage: `${shimmedPlugin} is a shimmed plugin that is not allowed to import modules from the legacy platform. If you need legacy modules for the transition period, import them either in the legacy_imports, kibana_services or index module.`,
  }));
}

module.exports = {
  rules: {
    'no-console': 2,
    'import/no-default-export': 'error',
    '@kbn/eslint/no-restricted-paths': [
      'error',
      {
        basePath: path.resolve(__dirname, '../'),
        zones: buildRestrictedPaths(['visualize', 'discover', 'dashboard', 'devTools', 'home']),
      },
    ],
  },
};
