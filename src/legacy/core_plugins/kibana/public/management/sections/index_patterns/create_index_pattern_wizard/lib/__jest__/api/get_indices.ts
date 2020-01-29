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

export const successfulResponse = {
  hits: {
    total: 1,
    max_score: 0.0,
    hits: [],
  },
  aggregations: {
    indices: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '1',
          doc_count: 1,
        },
        {
          key: '2',
          doc_count: 1,
        },
      ],
    },
  },
};

export const exceptionResponse = {
  body: {
    error: {
      root_cause: [
        {
          type: 'index_not_found_exception',
          reason: 'no such index',
          index_uuid: '_na_',
          'resource.type': 'index_or_alias',
          'resource.id': 't',
          index: 't',
        },
      ],
      type: 'transport_exception',
      reason: 'unable to communicate with remote cluster [cluster_one]',
      caused_by: {
        type: 'index_not_found_exception',
        reason: 'no such index',
        index_uuid: '_na_',
        'resource.type': 'index_or_alias',
        'resource.id': 't',
        index: 't',
      },
    },
  },
  status: 500,
};

export const errorResponse = {
  statusCode: 400,
  error: 'Bad Request',
};
