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

export function scrollSearchApi(server) {
  server.route({
    path: '/api/kibana/legacy_scroll_start',
    method: ['POST'],
    handler: async req => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const { index, size, body } = req.payload;
      const params = {
        index,
        size,
        body,
        scroll: '1m',
        sort: '_doc',
      };

      try {
        return await callWithRequest(req, 'search', params);
      } catch (err) {
        throw server.plugins.elasticsearch.handleESError(err);
      }
    },
  });

  server.route({
    path: '/api/kibana/legacy_scroll_continue',
    method: ['POST'],
    handler: async req => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const { scrollId } = req.payload;
      try {
        return await callWithRequest(req, 'scroll', { scrollId, scroll: '1m' });
      } catch (err) {
        throw server.plugins.elasticsearch.handleESError(err);
      }
    },
  });
}
