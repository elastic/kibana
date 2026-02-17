/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, type MutableRefObject } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLCallbacks, ESQLControlVariable } from '@kbn/esql-types';
import { KQL_TYPE_TO_KIND_MAP } from '@kbn/esql-types';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ILicense } from '@kbn/licensing-types';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { MapCache } from 'lodash';
import type { FavoritesClient } from '@kbn/content-management-favorites-public';
import {
  getESQLAdHocDataview,
  getEditorExtensions,
  getEsqlPolicies,
  getInferenceEndpoints,
  getTimeseriesIndices,
  getViews,
} from '@kbn/esql-utils';
import type { getEsqlColumns, getESQLSources } from '@kbn/esql-utils';
import { clearCacheWhenOld } from './helpers';
import { getHistoryItems } from './history_local_storage';
import type { ESQLEditorDeps } from './types';
import type { StarredQueryMetadata } from './editor_footer/esql_starred_queries_service';

type MemoizedFn<TArgs extends unknown[], TResult> = (...args: TArgs) => {
  timestamp: number;
  result: TResult;
};

type MemoizedFieldsFromESQL = MemoizedFn<
  [
    {
      esqlQuery: string;
      search: ISearchGeneric;
      timeRange: TimeRange;
      signal?: AbortSignal;
      dropNullColumns?: boolean;
      variables?: ESQLControlVariable[];
    }
  ],
  ReturnType<typeof getEsqlColumns>
>;

type MemoizedSources = MemoizedFn<
  [CoreStart, (() => Promise<ILicense | undefined>) | undefined],
  ReturnType<typeof getESQLSources>
>;

type MemoizedHistoryStarredItems = MemoizedFn<
  [typeof getHistoryItems, FavoritesClient<StarredQueryMetadata>],
  Promise<string[]>
>;

interface UseEsqlCallbacksParams {
  core: CoreStart;
  data: ESQLEditorDeps['data'];
  kql?: ESQLEditorDeps['kql'];
  fieldsMetadata?: ESQLEditorDeps['fieldsMetadata'];
  esqlService?: ESQLEditorDeps['esql'];
  histogramBarTarget: number;
  activeSolutionId?: Parameters<typeof getEditorExtensions>[2];
  canCreateLookupIndex: ESQLCallbacks['canCreateLookupIndex'];
  minimalQueryRef: MutableRefObject<string>;
  abortControllerRef: MutableRefObject<AbortController>;
  dataSourcesCache: MapCache;
  memoizedSources: MemoizedSources;
  esqlFieldsCache: MapCache;
  memoizedFieldsFromESQL: MemoizedFieldsFromESQL;
  historyStarredItemsCache: MapCache;
  memoizedHistoryStarredItems: MemoizedHistoryStarredItems;
  favoritesClient: FavoritesClient<StarredQueryMetadata>;
  getJoinIndicesCallback: Required<ESQLCallbacks>['getJoinIndices'];
  isResourceBrowserEnabled: () => Promise<boolean>;
}

export const useEsqlCallbacks = ({
  core,
  data,
  kql,
  fieldsMetadata,
  esqlService,
  histogramBarTarget,
  activeSolutionId,
  canCreateLookupIndex,
  minimalQueryRef,
  abortControllerRef,
  dataSourcesCache,
  memoizedSources,
  esqlFieldsCache,
  memoizedFieldsFromESQL,
  historyStarredItemsCache,
  memoizedHistoryStarredItems,
  favoritesClient,
  getJoinIndicesCallback,
  isResourceBrowserEnabled,
}: UseEsqlCallbacksParams): ESQLCallbacks => {
  const getSources = useCallback(async () => {
    clearCacheWhenOld(dataSourcesCache, minimalQueryRef.current);
    const getLicense = esqlService?.getLicense;
    const sources = await memoizedSources(core, getLicense).result;
    return sources;
  }, [dataSourcesCache, minimalQueryRef, memoizedSources, core, esqlService]);

  const getColumnsFor = useCallback(
    async ({ query: queryToExecute }: { query?: string } | undefined = {}) => {
      if (queryToExecute) {
        // Check if there's a stale entry and clear it
        clearCacheWhenOld(esqlFieldsCache, `${queryToExecute} | limit 0`);
        const timeRange = data.query.timefilter.timefilter.getTime();
        return (
          (await memoizedFieldsFromESQL({
            esqlQuery: queryToExecute,
            search: data.search.search,
            timeRange,
            signal: abortControllerRef.current.signal,
            variables: esqlService?.variablesService?.esqlVariables,
            dropNullColumns: true,
          }).result) || []
        );
      }
      return [];
    },
    [
      data.query.timefilter.timefilter,
      data.search.search,
      esqlFieldsCache,
      memoizedFieldsFromESQL,
      abortControllerRef,
      esqlService,
    ]
  );

  const getPolicies = useCallback(async () => getEsqlPolicies(core.http), [core.http]);

  const getPreferences = useCallback(
    async () => ({
      histogramBarTarget,
    }),
    [histogramBarTarget]
  );

  const fieldsMetadataClient = useMemo(() => fieldsMetadata?.getClient(), [fieldsMetadata]);

  const getVariables = useCallback(
    () => esqlService?.variablesService?.esqlVariables,
    [esqlService]
  );

  const canSuggestVariables = useCallback(
    () => esqlService?.variablesService?.isCreateControlSuggestionEnabled ?? false,
    [esqlService]
  );

  const getTimeseriesIndicesCallback = useCallback(async () => {
    return (await getTimeseriesIndices(core.http)) || [];
  }, [core.http]);

  const getViewsCallback = useCallback(async () => {
    return await getViews(core.http);
  }, [core.http]);

  const getEditorExtensionsCallback = useCallback(
    async (queryString: string) => {
      // Only fetch recommendations if there's an active solutionId and a non-empty query
      // Otherwise the route will return an error
      if (activeSolutionId && queryString.trim() !== '') {
        return await getEditorExtensions(core.http, queryString, activeSolutionId);
      }
      return {
        recommendedQueries: [],
        recommendedFields: [],
      };
    },
    [activeSolutionId, core.http]
  );

  const getInferenceEndpointsCallback = useCallback(
    async (taskType: InferenceTaskType) => {
      return (await getInferenceEndpoints(core.http, taskType)) || [];
    },
    [core.http]
  );

  const getLicense = useCallback(async () => {
    const ls = await esqlService?.getLicense();

    if (!ls) {
      return undefined;
    }

    return {
      ...ls,
      hasAtLeast: ls.hasAtLeast.bind(ls),
    };
  }, [esqlService]);

  const getActiveProduct = useCallback(() => core.pricing.getActiveProduct(), [core.pricing]);

  const getHistoryStarredItems = useCallback(async () => {
    clearCacheWhenOld(historyStarredItemsCache, 'historyStarredItems');
    return await memoizedHistoryStarredItems(getHistoryItems, favoritesClient).result;
  }, [historyStarredItemsCache, memoizedHistoryStarredItems, favoritesClient]);

  const isServerless = Boolean(esqlService?.isServerless);

  const getKqlSuggestions = useCallback(
    async (kqlQuery: string, cursorPositionInKql: number) => {
      const hasQuerySuggestions = kql?.autocomplete?.hasQuerySuggestions('kuery');
      if (!hasQuerySuggestions) {
        return undefined;
      }
      const dataView = await getESQLAdHocDataview({
        dataViewsService: data.dataViews,
        query: minimalQueryRef.current,
      });
      const suggestions = await kql?.autocomplete.getQuerySuggestions({
        language: 'kuery',
        query: kqlQuery,
        selectionStart: cursorPositionInKql,
        selectionEnd: cursorPositionInKql,
        indexPatterns: [dataView],
      });
      return (
        suggestions?.map((suggestion) => {
          return {
            text: suggestion.text,
            label: suggestion.text,
            detail: typeof suggestion.description === 'string' ? suggestion.description : undefined,
            kind: KQL_TYPE_TO_KIND_MAP[suggestion.type] ?? 'Value',
          };
        }) ?? []
      );
    },
    [data.dataViews, kql?.autocomplete, minimalQueryRef]
  );

  return useMemo<ESQLCallbacks>(
    () => ({
      getSources,
      getColumnsFor,
      getPolicies,
      getPreferences,
      // @ts-expect-error To prevent circular type import, type defined here is partial of full client
      getFieldsMetadata: fieldsMetadataClient,
      getVariables,
      canSuggestVariables,
      getJoinIndices: getJoinIndicesCallback,
      getTimeseriesIndices: getTimeseriesIndicesCallback,
      getViews: getViewsCallback,
      getEditorExtensions: getEditorExtensionsCallback,
      getInferenceEndpoints: getInferenceEndpointsCallback,
      getLicense,
      getActiveProduct,
      getHistoryStarredItems,
      canCreateLookupIndex,
      isServerless,
      getKqlSuggestions,
      isResourceBrowserEnabled,
    }),
    [
      getSources,
      getColumnsFor,
      getPolicies,
      getPreferences,
      fieldsMetadataClient,
      getVariables,
      canSuggestVariables,
      getJoinIndicesCallback,
      getTimeseriesIndicesCallback,
      getViewsCallback,
      getEditorExtensionsCallback,
      getInferenceEndpointsCallback,
      getLicense,
      getActiveProduct,
      getHistoryStarredItems,
      canCreateLookupIndex,
      isServerless,
      getKqlSuggestions,
      isResourceBrowserEnabled,
    ]
  );
};
