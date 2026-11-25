/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { BasicPrettyPrinter, EsqlQuery, mutate } from '@elastic/esql';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import { constructCascadeQuery } from '@kbn/esql-utils';
import {
  getDiscoverLocatorParams,
  toCascadeDocShareLocatorParams,
} from '../../utils/get_discover_locator_params';
import {
  selectCurrentProfileLocatorState,
  useCurrentTabSelector,
  useInternalStateSelector,
  useRuntimeStateManager,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useCopyLocatorLink } from '../../../../components/discover_grid_flyout';

/**
 * Copies a flyout link using the absolute time range that produced the current results.
 */
export const useCopyExpandedDocLink = ({
  dataView,
}: {
  dataView: DataView;
}): {
  copyLink: () => Promise<void>;
  shareQuery: Query | AggregateQuery | undefined;
} => {
  const services = useDiscoverServices();
  const runtimeStateManager = useRuntimeStateManager();
  const currentTab = useCurrentTabSelector((tab) => tab);
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );

  const cascadeShareQuery = useMemo(() => {
    if (!currentTab.expandedDocCascadePath || !isOfAggregateQueryType(currentTab.appState.query)) {
      return undefined;
    }

    try {
      const cascadeQuery = constructCascadeQuery({
        query: currentTab.appState.query,
        dataView,
        esqlVariables: currentTab.esqlVariables,
        nodeType: 'leaf',
        ...currentTab.expandedDocCascadePath,
      });
      if (!cascadeQuery) {
        return undefined;
      }
      // The link carries a document reference, and restoring one refetches the document
      // through this query by `_id`/`_index` (`fetch_expanded_doc.ts`): without asking for
      // them, the copied link could never bring the document back.
      const parsed = EsqlQuery.fromSrc(cascadeQuery.esql);
      mutate.commands.from.metadata.upsert(parsed.ast, '_id');
      mutate.commands.from.metadata.upsert(parsed.ast, '_index');
      return { ...cascadeQuery, esql: BasicPrettyPrinter.print(parsed.ast) };
    } catch {
      return undefined;
    }
  }, [
    currentTab.appState.query,
    currentTab.esqlVariables,
    currentTab.expandedDocCascadePath,
    dataView,
  ]);

  const shareQuery = cascadeShareQuery ?? currentTab.appState.query;

  const buildParams = useCallback(() => {
    const { filterManager, data, profileStateRegistry } = services;
    const { timefilter } = data.query.timefilter;

    const locatorParams = getDiscoverLocatorParams({
      currentTab,
      dataView,
      persistedDiscoverSession,
      filters: filterManager.getFilters(),
      timeRange: currentTab.dataRequestParams.timeRangeAbsolute ?? timefilter.getAbsoluteTime(),
      refreshInterval: timefilter.getRefreshInterval(),
      profileState: selectCurrentProfileLocatorState({
        runtimeStateManager,
        tabId: currentTab.id,
        profileStateMap: currentTab.profileState,
        profileStateRegistry,
      }),
    });

    return cascadeShareQuery
      ? toCascadeDocShareLocatorParams({
          locatorParams,
          query: cascadeShareQuery,
          expandedDoc: currentTab.expandedDoc,
        })
      : locatorParams;
  }, [
    cascadeShareQuery,
    currentTab,
    dataView,
    persistedDiscoverSession,
    runtimeStateManager,
    services,
  ]);

  const copyLink = useCopyLocatorLink(buildParams);

  return { copyLink, shareQuery };
};
