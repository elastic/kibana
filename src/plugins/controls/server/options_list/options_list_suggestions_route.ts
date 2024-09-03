/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';

import { schema } from '@kbn/config-schema';
import { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import { PluginSetup as UnifiedSearchPluginSetup } from '@kbn/unified-search-plugin/server';

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { OptionsListRequestBody, OptionsListResponse } from '../../common/options_list/types';
import { getValidationAggregationBuilder } from './options_list_validation_queries';
import { getSuggestionAggregationBuilder } from './suggestion_queries';

export const setupOptionsListSuggestionsRoute = (
  { http }: CoreSetup,
  getAutocompleteSettings: UnifiedSearchPluginSetup['autocomplete']['getAutocompleteSettings']
) => {
  const router = http.createRouter();

  router.versioned
    .post({
      access: 'internal',
      path: '/internal/controls/optionsList/{index}',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object(
              {
                index: schema.string(),
              },
              { unknowns: 'allow' }
            ),
            body: schema.object(
              {
                size: schema.number(),
                fieldName: schema.string(),
                sort: schema.maybe(schema.any()),
                filters: schema.maybe(schema.any()),
                fieldSpec: schema.maybe(schema.any()),
                allowExpensiveQueries: schema.boolean(),
                ignoreValidations: schema.maybe(schema.boolean()),
                searchString: schema.maybe(schema.string()),
                searchTechnique: schema.maybe(
                  schema.oneOf([
                    schema.literal('exact'),
                    schema.literal('prefix'),
                    schema.literal('wildcard'),
                  ])
                ),
                selectedOptions: schema.maybe(
                  schema.oneOf([schema.arrayOf(schema.string()), schema.arrayOf(schema.number())])
                ),
              },
              { unknowns: 'allow' }
            ),
          },
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
    const { runPastTimeout, filters, runtimeFieldMap, ignoreValidations } = request;
    const { terminateAfter, timeout } = getAutocompleteSettings();
    const timeoutSettings = runPastTimeout
      ? {}
      : { timeout: `${timeout}ms`, terminate_after: terminateAfter };

    const suggestionBuilder = getSuggestionAggregationBuilder(request);
    const validationBuilder = getValidationAggregationBuilder();

    const suggestionAggregation: any = suggestionBuilder.buildAggregation(request) ?? {};
    const validationAggregation: any = ignoreValidations
      ? {}
      : validationBuilder.buildAggregation(request);

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
        ...validationAggregation,
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
    const results = suggestionBuilder.parse(rawEsResult, request);
    const totalCardinality = results.totalCardinality;
    const invalidSelections = ignoreValidations
      ? []
      : validationBuilder.parse(rawEsResult, request);

    return {
      suggestions: results.suggestions,
      totalCardinality,
      invalidSelections,
    };
  };
};
