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

import { get, map } from 'lodash';
import handleESError from '../../../lib/handle_es_error';

export function registerValueSuggestions(server) {
  server.route({
    path: '/api/kibana/suggestions/values/{index}',
    method: ['POST'],
    handler: async function (req, reply) {
      const { index } = req.params;
      const { field, query, boolFilter } = req.payload;
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const body = getBody({ field, query, boolFilter });
      try {
        const response = await callWithRequest(req, 'search', { index, body });
        const buckets = get(response, 'aggregations.suggestions.buckets') || [];
        const suggestions = map(buckets, 'key');
        reply(suggestions);
      } catch (error) {
        reply(handleESError(error));
      }
    }
  });
}

function getBody({ field, query, boolFilter = [] }) {
  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map';

  // Helps keep the number of buckets that need to be tracked at the shard level contained in case
  // this is a high cardinality field
  const terminateAfter = 100000;

  // We don't care about the accuracy of the counts, just the content of the terms, so this reduces
  // the amount of information that needs to be transmitted to the coordinating node
  const shardSize = 10;

  return {
    size: 0,
    timeout: '1s',
    terminate_after: terminateAfter,
    query: {
      bool: {
        filter: boolFilter,
      }
    },
    aggs: {
      suggestions: {
        terms: {
          field,
          include: `${getEscapedQuery(query)}.*`,
          execution_hint: executionHint,
          shard_size: shardSize
        }
      }
    }
  };
}

function getEscapedQuery(query = '') {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  return query.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);
}
