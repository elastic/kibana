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

exports.getWebpackConfig = function (kibanaPath) {
  return {
    context: kibanaPath,
    resolve: {
      extensions: ['.js', '.json', '.ts', '.tsx'],
      mainFields: ['browser', 'main'],
      modules: ['node_modules', resolve(kibanaPath, 'node_modules')],
      alias: {
        // Dev defaults for test bundle https://github.com/elastic/kibana/blob/6998f074542e8c7b32955db159d15661aca253d7/src/core_plugins/tests_bundle/index.js#L73-L78
        fixtures: resolve(kibanaPath, 'src/fixtures'),
      },
      unsafeCache: true,
    },
  };
};
