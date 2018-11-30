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

import { pluginPaths } from '@kbn/interpreter/server';
import { getPluginStream } from '../lib/get_plugin_stream';

export function plugins(server) {
  server.route({
    method: 'GET',
    path: '/api/canvas/plugins',
    handler: function (request, h) {
      const { type } = request.query;

      if (!pluginPaths[type]) {
        return h.response({ error: 'Invalid type' }).code(400);
      }

      return getPluginStream(type);
    },
    config: {
      auth: false,
    },
  });
}
