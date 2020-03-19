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

import { BOOLEAN } from './shared';

export default function(api) {
  api.addEndpointDescription('put_settings', {
    data_autocomplete_rules: {
      refresh_interval: '1s',
      number_of_shards: 1,
      number_of_replicas: 1,
      'blocks.read_only': BOOLEAN,
      'blocks.read': BOOLEAN,
      'blocks.write': BOOLEAN,
      'blocks.metadata': BOOLEAN,
      term_index_interval: 32,
      term_index_divisor: 1,
      'translog.flush_threshold_ops': 5000,
      'translog.flush_threshold_size': '200mb',
      'translog.flush_threshold_period': '30m',
      'translog.disable_flush': BOOLEAN,
      'cache.filter.max_size': '2gb',
      'cache.filter.expire': '2h',
      'gateway.snapshot_interval': '10s',
      routing: {
        allocation: {
          include: {
            tag: '',
          },
          exclude: {
            tag: '',
          },
          require: {
            tag: '',
          },
          total_shards_per_node: -1,
        },
      },
      'recovery.initial_shards': {
        __one_of: ['quorum', 'quorum-1', 'half', 'full', 'full-1'],
      },
      'ttl.disable_purge': BOOLEAN,
      analysis: {
        analyzer: {},
        tokenizer: {},
        filter: {},
        char_filter: {},
      },
      'cache.query.enable': BOOLEAN,
      shadow_replicas: BOOLEAN,
      shared_filesystem: BOOLEAN,
      data_path: 'path',
      codec: {
        __one_of: ['default', 'best_compression', 'lucene_default'],
      },
    },
  });
}
