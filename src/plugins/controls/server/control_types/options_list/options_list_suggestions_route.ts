/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, isEmpty } from 'lodash';
import { schema } from '@kbn/config-schema';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { Observable } from 'rxjs';

import { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import { FieldSpec, getFieldSubtypeNested } from '@kbn/data-views-plugin/common';
import {
  OptionsListRequestBody,
  OptionsListResponse,
} from '../../../common/control_types/options_list/types';

export const setupOptionsListSuggestionsRoute = (
  { http }: CoreSetup,
  getAutocompleteSettings: DataPluginSetup['autocomplete']['getAutocompleteSettings']
) => {
  const router = http.createRouter();

  router.post(
    {
      path: '/api/kibana/controls/optionsList/{index}',
      validate: {
        params: schema.object(
          {
            index: schema.string(),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object(
          {
            fieldName: schema.string(),
            filters: schema.maybe(schema.any()),
            fieldSpec: schema.maybe(schema.any()),
            searchString: schema.maybe(schema.string()),
            selectedOptions: schema.maybe(schema.arrayOf(schema.string())),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, response) => {
      try {
        const suggestionRequest: OptionsListRequestBody = request.body;
        const { index } = request.params;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const suggestionsResponse = await getOptionsListSuggestions({
          abortedEvent$: request.events.aborted$,
          request: suggestionRequest,
          esClient,
          index,
        });
        return response.ok({ body: suggestionsResponse });
      } catch (e) {
        const kbnErr = getKbnServerError(e);
        return reportServerError(response, kbnErr);
      }
    }
  );

  const getOptionsListSuggestions = async ({
    abortedEvent$,
    esClient,
    request,
    index,
  }: {
    request: OptionsListRequestBody;
    abortedEvent$: Observable<void>;
    esClient: ElasticsearchClient;
    index: string;
  }): Promise<OptionsListResponse> => {
    const abortController = new AbortController();
    abortedEvent$.subscribe(() => abortController.abort());

    const { fieldName, searchString, selectedOptions, filters, fieldSpec } = request;
    const body = getOptionsListBody(fieldName, fieldSpec, searchString, selectedOptions, filters);

    const rawEsResult = await esClient.search({ index, body }, { signal: abortController.signal });

    // parse raw ES response into OptionsListSuggestionResponse
    const totalCardinality = get(rawEsResult, 'aggregations.unique_terms.value');

    const suggestions = get(rawEsResult, 'aggregations.suggestions.buckets')?.map(
      (suggestion: { key: string; key_as_string: string }) =>
        fieldSpec?.type === 'string' ? suggestion.key : suggestion.key_as_string
    );

    const rawInvalidSuggestions = get(rawEsResult, 'aggregations.validation.buckets') as {
      [key: string]: { doc_count: number };
    };
    const invalidSelections =
      rawInvalidSuggestions && !isEmpty(rawInvalidSuggestions)
        ? Object.entries(rawInvalidSuggestions)
            ?.filter(([, value]) => value?.doc_count === 0)
            ?.map(([key]) => key)
        : undefined;

    return {
      suggestions,
      totalCardinality,
      invalidSelections,
    };
  };

  const getOptionsListBody = (
    fieldName: string,
    fieldSpec?: FieldSpec,
    searchString?: string,
    selectedOptions?: string[],
    filters: estypes.QueryDslQueryContainer[] = []
  ) => {
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
    const getEscapedQuery = (q: string = '') =>
      q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);

    // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
    const executionHint = 'map' as const;

    // Suggestions
    const shardSize = 10;
    const suggestionsAgg = {
      terms: {
        field: fieldName,
        // terms on boolean fields don't support include
        ...(fieldSpec?.type !== 'boolean' && {
          include: `${getEscapedQuery(searchString ?? '')}.*`,
        }),
        execution_hint: executionHint,
        shard_size: shardSize,
      },
    };

    // Validation
    const selectedOptionsFilters = selectedOptions?.reduce((acc, currentOption) => {
      acc[currentOption] = { match: { [fieldName]: currentOption } };
      return acc;
    }, {} as { [key: string]: { match: { [key: string]: string } } });

    const validationAgg =
      selectedOptionsFilters && !isEmpty(selectedOptionsFilters)
        ? {
            filters: {
              filters: selectedOptionsFilters,
            },
          }
        : undefined;

    const { terminateAfter, timeout } = getAutocompleteSettings();

    const body = {
      size: 0,
      timeout: `${timeout}ms`,
      terminate_after: terminateAfter,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        suggestions: suggestionsAgg,
        ...(validationAgg ? { validation: validationAgg } : {}),
        unique_terms: {
          cardinality: {
            field: fieldName,
          },
        },
      },
    };

    const subTypeNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
    if (subTypeNested) {
      return {
        ...body,
        aggs: {
          nestedSuggestions: {
            nested: {
              path: subTypeNested.nested.path,
            },
            aggs: body.aggs,
          },
        },
      };
    }

    return body;
  };
};
