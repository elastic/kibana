/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useMemo, useState, MouseEventHandler, MouseEvent } from 'react';
import { AggregateQuery, Query, TimeRange, Filter, disableFilter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useHistory } from 'react-router-dom';
import { DataPublicPluginStart, FilterManager } from '@kbn/data-plugin/public';
import { useDiscoverServices } from './use_discover_services';

export interface UseNavigationProps {
  dataView: DataView;
  rowIndex: string | undefined;
  rowId: string | undefined;
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

const isModifiedEvent = (event: MouseEvent) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

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
  const [singleDocHref, setSingleDocHref] = useState('');
  const [contextViewHref, setContextViewHref] = useState('');

  const index = useMemo(
    () => (dataView.isPersisted() ? dataView.id! : dataView.toSpec(false)),
    [dataView]
  );

  const buildParams = useCallback(
    () =>
      getStateParams({
        isEmbeddableView,
        columns,
        filters,
        filterManager: services.filterManager,
        data: services.data,
        savedSearchId,
      }),
    [columns, filters, isEmbeddableView, savedSearchId, services.data, services.filterManager]
  );

  useEffect(() => {
    if (!rowIndex || !rowId) {
      return;
    }
    const dataViewId = typeof index === 'object' ? index.id : index;
    services.locator
      .getUrl({ dataViewId, ...buildParams() })
      .then((referrer) => {
        return services.singleDocLocator.getRedirectUrl({ index, rowIndex, rowId, referrer });
      })
      .then(setSingleDocHref);
  }, [
    index,
    rowIndex,
    rowId,
    services.singleDocLocator,
    setSingleDocHref,
    services.locator,
    buildParams,
  ]);

  useEffect(() => {
    if (!rowIndex || !rowId) {
      return;
    }
    const params = buildParams();
    const dataViewId = typeof index === 'object' ? index.id : index;
    services.locator
      .getUrl({ dataViewId, ...params })
      .then((referrer) =>
        services.contextLocator.getRedirectUrl({
          index,
          rowId,
          columns: params.columns,
          filters: params.filters?.map(disableFilter),
          referrer,
        })
      )
      .then(setContextViewHref);
  }, [
    index,
    rowIndex,
    rowId,
    setContextViewHref,
    buildParams,
    services.contextLocator,
    services.locator,
  ]);

  const onOpenSingleDoc: MouseEventHandler = useCallback(
    (event) => {
      if (isModifiedEvent(event) || !rowIndex || !rowId) {
        return;
      }
      event.preventDefault();
      const dataViewId = typeof index === 'object' ? index.id : index;
      services.locator
        .getUrl({ dataViewId, ...buildParams() })
        .then((referrer) =>
          services.singleDocLocator.navigate({ index, rowIndex, rowId, referrer })
        );
    },
    [buildParams, index, rowId, rowIndex, services.locator, services.singleDocLocator]
  );

  const onOpenContextView: MouseEventHandler = useCallback(
    (event) => {
      if (isModifiedEvent(event) || !rowId) {
        return;
      }
      event.preventDefault();
      const params = buildParams();
      const dataViewId = typeof index === 'object' ? index.id : index;
      services.locator.getUrl({ dataViewId, ...params }).then((referrer) =>
        services.contextLocator.navigate({
          index,
          rowId,
          columns: params.columns,
          filters: params.filters?.map(disableFilter),
          referrer,
        })
      );
    },
    [buildParams, index, rowId, services.contextLocator, services.locator]
  );

  return {
    singleDocHref,
    contextViewHref,
    onOpenSingleDoc,
    onOpenContextView,
  };
};
