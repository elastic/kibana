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

export default function(api) {
  api.addEndpointDescription('reindex', {
    methods: ['POST'],
    patterns: ['_reindex'],
    data_autocomplete_rules: {
      __template: {
        source: {},
        dest: {},
      },
      source: {
        index: '',
        type: '',
        query: {
          __scope_link: 'GLOBAL.query',
        },
        sort: {
          __template: {
            FIELD: 'desc',
          },
          FIELD: { __one_of: ['asc', 'desc'] },
        },
        size: 1000,
        remote: {
          __template: {
            host: '',
          },
          host: '',
          username: '',
          password: '',
          socket_timeout: '30s',
          connect_timeout: '30s',
        },
      },
      dest: {
        index: '',
        version_type: { __one_of: ['internal', 'external'] },
        op_type: 'create',
        routing: { __one_of: ['keep', 'discard', '=SOME TEXT'] },
        pipeline: '',
      },
      conflicts: 'proceed',
      size: 10,
      script: { __scope_link: 'GLOBAL.script' },
    },
  });
}
