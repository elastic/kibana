/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

import type {
  AggregationsAggregationContainer,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { PluginSetup as KqlPluginSetup } from '@kbn/kql/server';

import type {
  OptionsListDSLFetchBody,
  OptionsListRequestBody,
  OptionsListResponse,
} from '../../common/options_list/types';
import { getValidationAggregationBuilder } from './options_list_validation_queries';
import { getSuggestionAggregationBuilder } from './suggestion_queries';

/**
 * Runs an options list suggestion request against Elasticsearch.
 *
 * The caller supplies `search`, so a plugin that owns a private index can authorize the request
 * itself and query with an internal user instead of going through the controls plugin's own route.
 */
export const getOptionsListDslSuggestions = async ({
  abortedEvent$,
  search,
  request,
  getAutocompleteSettings,
}: {
  request: OptionsListDSLFetchBody;
  abortedEvent$: Observable<void>;
  search: (
    body: SearchRequest,
    options: { signal: AbortSignal }
  ) => Promise<SearchResponse<unknown>>;
  getAutocompleteSettings: KqlPluginSetup['autocomplete']['getAutocompleteSettings'];
}): Promise<OptionsListResponse> => {
  const abortController = new AbortController();
  abortedEvent$.subscribe(() => abortController.abort());

  const { kind: _kind, index, projectRouting, ...rest } = request;
  const suggestionRequest = rest as OptionsListRequestBody;
  /**
   * Build ES Query
   */
  const { runPastTimeout, filters, runtimeFieldMap, ignoreValidations } = suggestionRequest;
  const { terminateAfter, timeout } = getAutocompleteSettings();
  const timeoutSettings = runPastTimeout
    ? {}
    : { timeout: `${timeout}ms`, terminate_after: terminateAfter };

  const suggestionBuilder = getSuggestionAggregationBuilder(suggestionRequest);
  const validationBuilder = getValidationAggregationBuilder();

  const suggestionAggregation = (suggestionBuilder.buildAggregation(suggestionRequest) ??
    {}) as Record<string, AggregationsAggregationContainer>;
  const validationAggregation = (
    ignoreValidations ? {} : validationBuilder.buildAggregation(suggestionRequest)
  ) as Record<string, AggregationsAggregationContainer>;

  const searchFilter = suggestionBuilder.buildSearchFilter?.(suggestionRequest);

  const body: SearchRequest = {
    size: 0,
    ...timeoutSettings,
    query: {
      bool: {
        filter: [...(filters ?? []), ...(searchFilter ? [searchFilter] : [])],
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
  const rawEsResult = await search(
    {
      index,
      ...(projectRouting !== undefined && { project_routing: projectRouting }),
      ...body,
    },
    { signal: abortController.signal }
  );

  /**
   * Parse ES response into Options List Response
   */
  const results = suggestionBuilder.parse(rawEsResult, suggestionRequest);
  const totalCardinality = results.totalCardinality;
  const invalidSelections = ignoreValidations
    ? []
    : validationBuilder.parse(rawEsResult, suggestionRequest);

  return {
    suggestions: results.suggestions,
    totalCardinality,
    invalidSelections,
    isPartial: Boolean(rawEsResult.terminated_early || rawEsResult.timed_out),
  };
};
