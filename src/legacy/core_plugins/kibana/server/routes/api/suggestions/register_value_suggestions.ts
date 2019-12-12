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

import { Legacy } from 'kibana';
import { get, map } from 'lodash';

import {
  IFieldType,
  indexPatternsUtils,
  esFilters,
} from '../../../../../../../plugins/data/server';

interface ISuggestionsValuesPayload {
  field: string;
  query: string;
  boolFilter: esFilters.Filter[];
}

// @ts-ignore
import { abortableRequestHandler } from '../../../../../elasticsearch/lib/abortable_request_handler';

const PATH = '/api/kibana/suggestions/values/{index}';

export function registerValueSuggestions(server: Legacy.Server) {
  server.route({
    path: PATH,
    method: ['POST'],
    handler: abortableRequestHandler(async (signal: AbortSignal, req: Legacy.Request) => {
      const { index } = req.params;
      const { field: fieldName, query, boolFilter } = req.payload as ISuggestionsValuesPayload;
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const savedObjectsClient = req.getSavedObjectsClient();

      const indexPattern = await indexPatternsUtils.findIndexPatternById(savedObjectsClient, index);
      const field = indexPatternsUtils.getFieldByName(fieldName, indexPattern);
      const body = getBody(server, field || fieldName, query, boolFilter);

      try {
        const response = await callWithRequest(req, 'search', { index, body }, { signal });
        const buckets: any[] =
          get(response, 'aggregations.suggestions.buckets') ||
          get(response, 'aggregations.nestedSuggestions.suggestions.buckets');

        return map(buckets || [], 'key');
      } catch (error) {
        throw server.plugins.elasticsearch.handleESError(error);
      }
    }),
  });
}

function getBody(
  server: Legacy.Server,
  field: IFieldType | string,
  query: string,
  boolFilter: esFilters.Filter[]
) {
  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map';

  // We don't care about the accuracy of the counts, just the content of the terms, so this reduces
  // the amount of information that needs to be transmitted to the coordinating node
  const shardSize = 10;

  const { timeout, terminate_after } = getAutocompleteOptions(server);

  const body = {
    size: 0,
    timeout,
    terminate_after,
    query: {
      bool: {
        filter: boolFilter,
      },
    },
    aggs: {
      suggestions: {
        terms: {
          field: isFieldObject(field) ? field.name : field,
          include: `${getEscapedQuery(query)}.*`,
          execution_hint: executionHint,
          shard_size: shardSize,
        },
      },
    },
  };

  if (isFieldObject(field) && field.subType && field.subType.nested) {
    return {
      ...body,
      aggs: {
        nestedSuggestions: {
          nested: {
            path: field.subType.nested.path,
          },
          aggs: body.aggs,
        },
      },
    };
  }

  return body;
}

function getAutocompleteOptions(server: Legacy.Server) {
  const serverConfig = server.config();

  return {
    terminate_after: serverConfig.get<number>('kibana.autocompleteTerminateAfter'),
    timeout: `${serverConfig.get<number>('kibana.autocompleteTimeout')}ms`,
  };
}

function isFieldObject(field: any): field is IFieldType {
  return Boolean(field && field.name);
}

function getEscapedQuery(query: string = '') {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  return query.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, match => `\\${match}`);
}
