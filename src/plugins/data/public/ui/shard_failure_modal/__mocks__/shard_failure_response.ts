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

import { SearchResponse } from 'elasticsearch';

export const shardFailureResponse: SearchResponse<any> = {
  _shards: {
    total: 2,
    successful: 1,
    skipped: 0,
    failed: 1,
    failures: [
      {
        shard: 0,
        index: 'repro2',
        node: 'itsmeyournode',
        reason: {
          type: 'script_exception',
          reason: 'runtime error',
          script_stack: ["return doc['targetfield'].value;", '           ^---- HERE'],
          script: "return doc['targetfield'].value;",
          lang: 'painless',
          caused_by: {
            type: 'illegal_argument_exception',
            reason: 'Gimme reason',
          },
        },
      },
    ],
  },
} as any;
