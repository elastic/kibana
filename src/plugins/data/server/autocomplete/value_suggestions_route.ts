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
import { IRouter, SharedGlobalConfig } from 'kibana/server';

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { IFieldType, indexPatterns, esFilters } from '../index';
import { getRequestAbortedSignal } from '../lib';

export function registerValueSuggestionsRoute(
  router: IRouter,
  config$: Observable<SharedGlobalConfig>
) {
  router.post(
    {
      path: '/api/kibana/suggestions/values/{index}',
      validate: {
        params: schema.object(
          {
            index: schema.string(),
          },
          { allowUnknowns: false }
        ),
        body: schema.object(
          {
            field: schema.string(),
            query: schema.string(),
            boolFilter: schema.maybe(schema.any()),
          },
          { allowUnknowns: false }
        ),
      },
    },
    async (context, request, response) => {
      const config = await config$.pipe(first()).toPromise();
      const { field: fieldName, query, boolFilter } = request.body;
      const { index } = request.params;
      const { dataClient } = context.core.elasticsearch;
      const signal = getRequestAbortedSignal(request.events.aborted$);

      const autocompleteSearchOptions = {
        timeout: `${config.kibana.autocompleteTimeout.asMilliseconds()}ms`,
        terminate_after: config.kibana.autocompleteTerminateAfter.asMilliseconds(),
      };

      const indexPattern = await indexPatterns.findIndexPatternById(
        context.core.savedObjects.client,
        index
      );

      const field = indexPattern && indexPatterns.getFieldByName(fieldName, indexPattern);
      const body = await getBody(autocompleteSearchOptions, field || fieldName, query, boolFilter);

      try {
        const result = await dataClient.callAsCurrentUser('search', { index, body }, { signal });

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

async function getBody(
  { timeout, terminate_after }: Record<string, any>,
  field: IFieldType | string,
  query: string,
  boolFilter: esFilters.Filter[] = []
) {
  const isFieldObject = (f: any): f is IFieldType => Boolean(f && f.name);

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  const getEscapedQuery = (q: string = '') =>
    q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, match => `\\${match}`);

  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map';

  // We don't care about the accuracy of the counts, just the content of the terms, so this reduces
  // the amount of information that needs to be transmitted to the coordinating node
  const shardSize = 10;
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
