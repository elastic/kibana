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

const { resolve } = require('path');

const { debug } = require('./debug');
const { getPlugins } = require('./get_plugins');

exports.getWebpackConfig = function (kibanaPath, projectRoot, config) {
  const fromKibana = (...path) => resolve(kibanaPath, ...path);

  const alias = {
    // Kibana defaults https://github.com/elastic/kibana/blob/6998f074542e8c7b32955db159d15661aca253d7/src/legacy/ui/ui_bundler_env.js#L30-L36
    ui: fromKibana('src/legacy/ui/public'),
    test_harness: fromKibana('src/test_harness/public'),

    // Dev defaults for test bundle https://github.com/elastic/kibana/blob/6998f074542e8c7b32955db159d15661aca253d7/src/core_plugins/tests_bundle/index.js#L73-L78
    ng_mock$: fromKibana('src/test_utils/public/ng_mock'),
    'angular-mocks$': fromKibana(
      'src/legacy/core_plugins/tests_bundle/webpackShims/angular-mocks.js'
    ),
    fixtures: fromKibana('src/fixtures'),
    test_utils: fromKibana('src/test_utils/public'),
  };

  getPlugins(config, kibanaPath, projectRoot).forEach((plugin) => {
    alias[`plugins/${plugin.name}`] = plugin.publicDirectory;
  });

  debug('Webpack resolved aliases', alias);

  return {
    context: kibanaPath,
    resolve: {
      extensions: ['.js', '.json', '.ts', '.tsx'],
      mainFields: ['browser', 'main'],
      modules: [
        'webpackShims',
        'node_modules',
        fromKibana('webpackShims'),
        fromKibana('node_modules'),
      ],
      alias,
      unsafeCache: true,
    },
  };
};
