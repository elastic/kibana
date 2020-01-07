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

const path = require('path');

/**
 * Builds custom restricted paths configuration for the shimmed plugins within the kibana plugin.
 * These custom rules extend the default checks in the top level `eslintrc.js` by also checking two other things:
 * * Making sure nothing within np_ready imports from the `ui` directory
 * * Making sure no other code is importing things deep from within the shimmed plugins
 * @param shimmedPlugins List of plugin names within the kibana plugin that are partially np ready
 * @returns zones configuration for the no-restricted-paths linter
 */
function buildRestrictedPaths(shimmedPlugins) {
  return shimmedPlugins.map(shimmedPlugin => ([{
    target: [
      `src/legacy/core_plugins/kibana/public/${shimmedPlugin}/np_ready/**/*`,
    ],
    from: [
      'ui/**/*',
      'src/legacy/ui/**/*',
      'src/legacy/core_plugins/kibana/public/**/*',
      'src/legacy/core_plugins/data/public/**/*',
      '!src/legacy/core_plugins/data/public/index.ts',
      `!src/legacy/core_plugins/kibana/public/${shimmedPlugin}/**/*`,
    ],
    allowSameFolder: false,
    errorMessage: `${shimmedPlugin} is a shimmed plugin that is not allowed to import modules from the legacy platform. If you need legacy modules for the transition period, import them either in the legacy_imports, kibana_services or index module.`,
  }, {
    target: [
      'src/**/*',
      `!src/legacy/core_plugins/kibana/public/${shimmedPlugin}/**/*`,
      'x-pack/**/*',
    ],
    from: [
      `src/legacy/core_plugins/kibana/public/${shimmedPlugin}/**/*`,
      `!src/legacy/core_plugins/kibana/public/${shimmedPlugin}/index.ts`,
      `!src/legacy/core_plugins/kibana/public/${shimmedPlugin}/legacy.ts`,
    ],
    allowSameFolder: false,
    errorMessage: `kibana/public/${shimmedPlugin} is behaving like a NP plugin and does not allow deep imports. If you need something from within ${shimmedPlugin} in another plugin, consider re-exporting it from the top level index module`,
  }])).reduce((acc, part) => [...acc, ...part], []);
}

module.exports = {
  rules: {
    'no-console': 2,
    'import/no-default-export': 'error',
    '@kbn/eslint/no-restricted-paths': [
      'error',
      {
        basePath: path.resolve(__dirname, '../../../../../'),
        zones: buildRestrictedPaths(['visualize', 'discover', 'dashboard', 'devTools', 'home']),
      },
    ],
  },
};
