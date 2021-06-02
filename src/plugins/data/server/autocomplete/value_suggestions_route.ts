/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, map } from 'lodash';
import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import type { estypes } from '@elastic/elasticsearch';
import type { IFieldType } from '../index';
import { findIndexPatternById, getFieldByName } from '../index_patterns';
import { getRequestAbortedSignal } from '../lib';
import { ConfigSchema } from '../../config';

export function registerValueSuggestionsRoute(router: IRouter, config$: Observable<ConfigSchema>) {
  router.post(
    {
      path: '/api/kibana/suggestions/values/{index}',
      validate: {
        params: schema.object(
          {
            index: schema.string(),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object(
          {
            field: schema.string(),
            query: schema.string(),
            filters: schema.maybe(schema.any()),
            fieldMeta: schema.maybe(schema.any()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, response) => {
      const config = await config$.pipe(first()).toPromise();
      const { field: fieldName, query, filters, fieldMeta } = request.body;
      const { index } = request.params;
      const { client } = context.core.elasticsearch.legacy;
      const signal = getRequestAbortedSignal(request.events.aborted$);

      const autocompleteSearchOptions = {
        timeout: `${config.autocomplete.valueSuggestions.timeout.asMilliseconds()}ms`,
        terminate_after: config.autocomplete.valueSuggestions.terminateAfter.asMilliseconds(),
      };

      let field: IFieldType | undefined = fieldMeta;

      if (!field?.name && !field?.type) {
        const indexPattern = await findIndexPatternById(context.core.savedObjects.client, index);

        field = indexPattern && getFieldByName(fieldName, indexPattern);
      }

      const body = await getBody(autocompleteSearchOptions, field || fieldName, query, filters);

      const result = await client.callAsCurrentUser('search', { index, body }, { signal });

      const buckets: any[] =
        get(result, 'aggregations.suggestions.buckets') ||
        get(result, 'aggregations.nestedSuggestions.suggestions.buckets');

      return response.ok({ body: map(buckets || [], 'key') });
    }
  );
}

async function getBody(
  // eslint-disable-next-line @typescript-eslint/naming-convention
  { timeout, terminate_after }: Record<string, any>,
  field: IFieldType | string,
  query: string,
  filters: estypes.QueryContainer[] = []
) {
  const isFieldObject = (f: any): f is IFieldType => Boolean(f && f.name);

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  const getEscapedQuery = (q: string = '') =>
    q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);

  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map' as const;

  // We don't care about the accuracy of the counts, just the content of the terms, so this reduces
  // the amount of information that needs to be transmitted to the coordinating node
  const shardSize = 10;
  const body = {
    size: 0,
    timeout,
    terminate_after,
    query: {
      bool: {
        filter: filters,
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
