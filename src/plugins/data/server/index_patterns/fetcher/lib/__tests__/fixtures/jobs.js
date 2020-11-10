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

export const jobs = [
  {
    job_id: 'foo1',
    rollup_index: 'foo_rollup',
    index_pattern: 'foo-*',
    fields: {
      node: [
        {
          agg: 'terms',
        },
      ],
      temperature: [
        {
          agg: 'min',
        },
        {
          agg: 'max',
        },
        {
          agg: 'sum',
        },
      ],
      timestamp: [
        {
          agg: 'date_histogram',
          time_zone: 'UTC',
          interval: '1h',
          delay: '7d',
        },
      ],
      voltage: [
        {
          agg: 'histogram',
          interval: 5,
        },
        {
          agg: 'sum',
        },
      ],
    },
  },
  {
    job_id: 'foo2',
    rollup_index: 'foo_rollup',
    index_pattern: 'foo-*',
    fields: {
      host: [
        {
          agg: 'terms',
        },
      ],
      timestamp: [
        {
          agg: 'date_histogram',
          time_zone: 'UTC',
          interval: '1h',
          delay: '7d',
        },
      ],
      voltage: [
        {
          agg: 'histogram',
          interval: 20,
        },
      ],
    },
  },
  {
    job_id: 'foo3',
    rollup_index: 'foo_rollup',
    index_pattern: 'foo-*',
    fields: {
      timestamp: [
        {
          agg: 'date_histogram',
          time_zone: 'PST',
          interval: '1h',
          delay: '7d',
        },
      ],
      voltage: [
        {
          agg: 'histogram',
          interval: 5,
        },
        {
          agg: 'sum',
        },
      ],
    },
  },
];
