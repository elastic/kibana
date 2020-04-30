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

import { ParsedUsageCollection } from '../ts_parser';

export const parsedWorkingCollector: ParsedUsageCollection = [
  'src/dev/telemetry/__fixture__/working_collector.ts',
  {
    collectorName: 'my_working_collector',
    mapping: {
      value: {
        flat: {
          type: 'keyword',
        },
        my_str: {
          type: 'text',
        },
        my_objects: {
          total: {
            type: 'number',
          },
        },
      },
    },
    fetch: {
      typeName: 'Usage',
      typeDescriptor: {
        flat: {
          kind: 142,
        },
        my_str: {
          kind: 142,
        },
        my_objects: {
          total: {
            kind: 139,
          },
        },
      },
      signature: '549a0f91fd6372dee97ae2436ad23ca3',
    },
  },
];
