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

export default {
  took: 35,
  timed_out: false,
  _shards: {
    total: 7,
    successful: 7,
    failed: 0,
  },
  hits: {
    total: 218512,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    1: {
      buckets: {
        '*-1024.0': {
          to: 1024,
          to_as_string: '1024.0',
          doc_count: 20904,
        },
        '1024.0-2560.0': {
          from: 1024,
          from_as_string: '1024.0',
          to: 2560,
          to_as_string: '2560.0',
          doc_count: 23358,
        },
        '2560.0-*': {
          from: 2560,
          from_as_string: '2560.0',
          doc_count: 174250,
        },
      },
    },
  },
};
