/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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

/**
 * Use callback handler on click. Otherwise href is used.
 */
const useButtonNavigationRef = ({ onClick }: { onClick: () => void }) => {
  const handler = useCallback(
    (event) => {
      // if ctrl or meta key is pressed, use callback to navigate,
      // otherwise use href to open in a new tab
      if (!event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>();
  const handlerRef = useRef(handler);

  return useCallback(
    (buttonElement: HTMLButtonElement | HTMLAnchorElement | null) => {
      if (buttonElement) {
        buttonRef.current = buttonElement;
        handlerRef.current = handler;
        buttonElement?.addEventListener('click', handlerRef.current);
      } else if (buttonRef.current) {
        buttonRef.current.removeEventListener('click', handlerRef.current);
      }
    },
    [handler]
  );
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
  const [singleDocHref, setSingleDocHref] = useState('');
  const [contextViewHref, setContextViewHref] = useState('');

  const index = useMemo(
    () => (dataView.isPersisted() ? dataView.id! : dataView.toSpec(false)),
    [dataView]
  );

  const params = useMemo(
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

  const referrer = services.locator.useUrl({ index, ...params });

  useEffect(() => {
    const href = services.singleDocLocator.getRedirectUrl({ index, rowIndex, rowId, referrer });
    setSingleDocHref(href);
  }, [index, rowIndex, rowId, referrer, services.singleDocLocator, setSingleDocHref]);

  useEffect(() => {
    const href = services.contextLocator.getRedirectUrl({
      index,
      rowId,
      columns: params.columns,
      filters: params.filters?.map(disableFilter),
      referrer,
    });
    setContextViewHref(href);
  }, [
    index,
    rowIndex,
    rowId,
    referrer,
    services.contextLocator,
    setContextViewHref,
    params.columns,
    params.filters,
  ]);

  const onOpenSingleDoc = useCallback(
    () => services.singleDocLocator.navigate({ index, rowIndex, rowId, referrer }),
    [index, referrer, rowId, rowIndex, services.singleDocLocator]
  );

  const openContextView = useCallback(
    () =>
      services.contextLocator.navigate({
        index,
        rowId,
        columns: params.columns,
        filters: params.filters?.map(disableFilter),
        referrer,
      }),
    [index, params.columns, params.filters, referrer, rowId, services.contextLocator]
  );

  const singleDocButtonRef = useButtonNavigationRef({ onClick: onOpenSingleDoc });

  const contextViewButtonRef = useButtonNavigationRef({ onClick: openContextView });

  return { singleDocHref, contextViewHref, singleDocButtonRef, contextViewButtonRef };
};
