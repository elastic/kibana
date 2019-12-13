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
import { schema } from '@kbn/config-schema';
import { APICaller, IRouter, IUiSettingsClient, KibanaRequest } from 'kibana/server';

import { IFieldType, indexPatternsUtils, esFilters } from '../index';

interface ISuggestionsValuesPayload {
  field: string;
  query: string;
  boolFilter: esFilters.Filter[];
}

export function registerValueSuggestionsRoute(
  router: IRouter,
  apiCaller: (request: KibanaRequest) => Promise<APICaller>
) {
  router.post(
    {
      path: '/api/kibana/suggestions/values/{index}',
      validate: {
        query: schema.object(
          {
            index: schema.string(),
          },
          { allowUnknowns: true }
        ),
        body: schema.object({}, { allowUnknowns: true }),
      },
    },
    async (context, request, response) => {
      const { client: uiSettings } = context.core.uiSettings;
      const { index } = request.query;
      const { field: fieldName, query, boolFilter } = request.body as ISuggestionsValuesPayload;

      const indexPattern = await indexPatternsUtils.findIndexPatternById(
        context.core.savedObjects.client,
        index
      );

      const field = indexPatternsUtils.getFieldByName(fieldName, indexPattern);
      const body = getBody(uiSettings, field || fieldName, query, boolFilter);

      try {
        const callCluster = await apiCaller(request);
        const result = await callCluster('search', { index, body });

        const buckets: any[] =
          get(result, 'aggregations.suggestions.buckets') ||
          get(result, 'aggregations.nestedSuggestions.suggestions.buckets');

        return response.ok({ body: map(buckets || [], 'key') });
      } catch (error) {
        return response.internalError({ body: error });
      }
    }
  );
}

function getBody(
  uiSettings: IUiSettingsClient,
  field: IFieldType | string,
  query: string,
  boolFilter: esFilters.Filter[]
) {
  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map';

  // We don't care about the accuracy of the counts, just the content of the terms, so this reduces
  // the amount of information that needs to be transmitted to the coordinating node
  const shardSize = 10;

  const { timeout, terminate_after } = getAutocompleteOptions(uiSettings);

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

function getAutocompleteOptions(uiSettings: IUiSettingsClient) {
  return {
    terminate_after: uiSettings.get<number>('kibana.autocompleteTerminateAfter'),
    timeout: `${uiSettings.get<number>('kibana.autocompleteTimeout')}ms`,
  };
}

function isFieldObject(field: any): field is IFieldType {
  return Boolean(field && field.name);
}

function getEscapedQuery(query: string = '') {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  return query.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, match => `\\${match}`);
}
