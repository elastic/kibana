/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { get } from 'lodash';

import { PluginSetup as UnifiedSearchPluginSetup } from '@kbn/unified-search-plugin/server';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { SearchRequest } from '@kbn/data-plugin/common';
import { schema } from '@kbn/config-schema';

import { OptionsListRequestBody, OptionsListResponse } from '../../common/options_list/types';
import {
  getSuggestionAggregationBuilder,
  getValidationAggregationBuilder,
} from './options_list_queries';

export const setupOptionsListSuggestionsRoute = (
  { http }: CoreSetup,
  getAutocompleteSettings: UnifiedSearchPluginSetup['autocomplete']['getAutocompleteSettings']
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
            sort: schema.maybe(schema.any()),
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

    /**
     * Build ES Query
     */
    const { runPastTimeout, filters, fieldName, runtimeFieldMap } = request;
    const { terminateAfter, timeout } = getAutocompleteSettings();
    const timeoutSettings = runPastTimeout
      ? {}
      : { timeout: `${timeout}ms`, terminate_after: terminateAfter };

    const suggestionBuilder = getSuggestionAggregationBuilder(request);
    const validationBuilder = getValidationAggregationBuilder();

    const builtSuggestionAggregation = suggestionBuilder.buildAggregation(request);
    const suggestionAggregation = builtSuggestionAggregation
      ? {
          suggestions: builtSuggestionAggregation,
        }
      : {};
    const builtValidationAggregation = validationBuilder.buildAggregation(request);
    const validationAggregations = builtValidationAggregation
      ? {
          validation: builtValidationAggregation,
        }
      : {};
    const body: SearchRequest['body'] = {
      size: 0,
      ...timeoutSettings,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        ...suggestionAggregation,
        ...validationAggregations,
        unique_terms: {
          cardinality: {
            field: fieldName,
          },
        },
      },
      runtime_mappings: {
        ...runtimeFieldMap,
      },
    };

    /**
     * Run ES query
     */
    const rawEsResult = await esClient.search({ index, body }, { signal: abortController.signal });

    /**
     * Parse ES response into Options List Response
     */
    const totalCardinality = get(rawEsResult, 'aggregations.unique_terms.value');
    const suggestions = suggestionBuilder.parse(rawEsResult);
    const invalidSelections = validationBuilder.parse(rawEsResult);
    return {
      suggestions,
      totalCardinality,
      invalidSelections,
      rejected: false,
    };
  };
};
