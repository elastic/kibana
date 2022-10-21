/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { AggregateQuery, Query, TimeRange, Filter, disableFilter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useHistory } from 'react-router-dom';
import { DataPublicPluginStart, FilterManager } from '@kbn/data-plugin/public';
import { useDiscoverServices } from './use_discover_services';

export interface UseNavigationProps {
  dataView: DataView;
  rowIndex: string;
  rowId: string;
  columns: string[];
  savedSearchId?: string;
  // provided by embeddable only
  filters?: Filter[];
}

const getStateParams = ({
  isEmbeddableView,
  columns,
  filters,
  filterManager,
  data,
  savedSearchId,
}: {
  isEmbeddableView: boolean;
  columns: string[];
  savedSearchId?: string;
  filters?: Filter[];
  filterManager: FilterManager;
  data: DataPublicPluginStart;
}) => {
  let appliedFilters: Filter[] = [];
  let query: Query | AggregateQuery | undefined;
  let timeRange: TimeRange | undefined;
  if (!isEmbeddableView) {
    // applied from discover main and context app
    appliedFilters = [...filterManager.getGlobalFilters(), ...filterManager.getAppFilters()];
    query = data.query.queryString.getQuery();
    timeRange = data.query.timefilter.timefilter.getTime();
  } else if (isEmbeddableView && filters?.length) {
    // applied from saved search embeddable
    appliedFilters = filters;
  }

  return {
    columns,
    query,
    timeRange,
    filters: appliedFilters,
    savedSearchId,
  };
};

export const useNavigationProps = ({
  dataView,
  rowIndex,
  rowId,
  columns,
  savedSearchId,
  filters,
}: UseNavigationProps) => {
  const isEmbeddableView = !useHistory();
  const services = useDiscoverServices();

  const buildCommonParams = useCallback(async () => {
    const params = getStateParams({
      isEmbeddableView,
      columns,
      filters,
      filterManager: services.filterManager,
      data: services.data,
      savedSearchId,
    });
    const referrer = await services.locator.getUrl({ dataViewId: dataView.id, ...params });
    return {
      dataViewId: dataView.id!,
      rowId,
      columns: params.columns,
      filters: params.filters,
      referrer,
    };
  }, [columns, dataView, filters, isEmbeddableView, rowId, savedSearchId, services]);

  const onOpenSingleDoc = useCallback(
    async (event) => {
      event.preventDefault();
      const params = await buildCommonParams();
      services.singleDocLocator.navigate({
        dataViewId: params.dataViewId,
        rowIndex,
        rowId: params.rowId,
        referrer: params.referrer,
      });
    },
    [buildCommonParams, rowIndex, services.singleDocLocator]
  );

  const onOpenSurrDocs = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const params = await buildCommonParams();
      services.contextLocator.navigate({
        dataViewId: params.dataViewId,
        rowId: params.rowId,
        referrer: params.referrer,
        columns: params.columns,
        filters: params.filters?.map(disableFilter),
      });
    },
    [buildCommonParams, services.contextLocator]
  );

  return { onOpenSingleDoc, onOpenSurrDocs };
};
