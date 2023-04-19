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
import { FilterManager, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DiscoverAppLocator } from '@kbn/discover-plugin/common';
import { DiscoverSingleDocLocator, DiscoverContextAppLocator } from '@kbn/discover-plugin/public';

export interface UseNavigationProps {
  dataView: DataView;
  rowIndex: string;
  rowId: string;
  columns: string[];
  savedSearchId?: string;
  // provided by embeddable only
  filters?: Filter[];
  // dependencies
  services: {
    filterManager: FilterManager;
    data: DataPublicPluginStart;
    singleDocLocator: DiscoverSingleDocLocator;
    locator: DiscoverAppLocator;
    contextLocator: DiscoverContextAppLocator;
  };
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
  services: { filterManager, data, locator, singleDocLocator, contextLocator },
}: UseNavigationProps) => {
  const isEmbeddableView = !useHistory();
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
        filterManager,
        data,
        savedSearchId,
      }),
    [columns, filters, isEmbeddableView, savedSearchId, data, filterManager]
  );

  useEffect(() => {
    const dataViewId = typeof index === 'object' ? index.id : index;
    locator
      .getUrl({ dataViewId, ...buildParams() })
      .then((referrer) => {
        return singleDocLocator.getRedirectUrl({ index, rowIndex, rowId, referrer });
      })
      .then(setSingleDocHref);
  }, [index, rowIndex, rowId, setSingleDocHref, buildParams, locator, singleDocLocator]);

  useEffect(() => {
    const params = buildParams();
    const dataViewId = typeof index === 'object' ? index.id : index;
    locator
      .getUrl({ dataViewId, ...params })
      .then((referrer) =>
        contextLocator.getRedirectUrl({
          index,
          rowId,
          columns: params.columns,
          filters: params.filters?.map(disableFilter),
          referrer,
        })
      )
      .then(setContextViewHref);
  }, [index, rowIndex, rowId, setContextViewHref, buildParams, locator, contextLocator]);

  const onOpenSingleDoc: MouseEventHandler = useCallback(
    (event) => {
      if (isModifiedEvent(event)) {
        return;
      }
      event.preventDefault();
      const dataViewId = typeof index === 'object' ? index.id : index;
      locator
        .getUrl({ dataViewId, ...buildParams() })
        .then((referrer) => singleDocLocator.navigate({ index, rowIndex, rowId, referrer }));
    },
    [buildParams, index, rowId, rowIndex, locator, singleDocLocator]
  );

  const onOpenContextView: MouseEventHandler = useCallback(
    (event) => {
      const params = buildParams();
      if (isModifiedEvent(event)) {
        return;
      }
      event.preventDefault();
      const dataViewId = typeof index === 'object' ? index.id : index;
      locator.getUrl({ dataViewId, ...params }).then((referrer) =>
        contextLocator.navigate({
          index,
          rowId,
          columns: params.columns,
          filters: params.filters?.map(disableFilter),
          referrer,
        })
      );
    },
    [buildParams, index, rowId, contextLocator, locator]
  );

  return {
    singleDocHref,
    contextViewHref,
    onOpenSingleDoc,
    onOpenContextView,
  };
};
