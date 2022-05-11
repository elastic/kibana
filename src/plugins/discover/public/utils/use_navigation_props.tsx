/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useRef } from 'react';
import { useHistory, matchPath } from 'react-router-dom';
import type { Location } from 'history';
import { stringify } from 'query-string';
import rison from 'rison-node';
import { disableFilter } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';
import { url } from '@kbn/kibana-utils-plugin/common';
import { useDiscoverServices } from './use_discover_services';

export type DiscoverNavigationProps = { onClick: () => void } | { href: string };

export interface UseNavigationProps {
  indexPatternId: string;
  rowIndex: string;
  rowId: string;
  columns: string[];
  filterManager: FilterManager;
  addBasePath: (url: string) => string;
}

export type HistoryState = { breadcrumb?: string } | undefined;

export const getContextHash = (columns: string[], filterManager: FilterManager) => {
  const globalFilters = filterManager.getGlobalFilters();
  const appFilters = filterManager.getAppFilters();

  const hash = stringify(
    url.encodeQuery({
      _g: rison.encode({
        filters: globalFilters || [],
      }),
      _a: rison.encode({
        columns,
        filters: (appFilters || []).map(disableFilter),
      }),
    }),
    { encode: false, sort: false }
  );

  return hash;
};

/**
 * When it's context route, breadcrumb link should point to the main discover page anyway.
 * Otherwise, we are on main page and should create breadcrumb link from it.
 * Current history object should be used in callback, since url state might be changed
 * after expanded document opened.
 */

const getCurrentBreadcrumbs = (
  isContextRoute: boolean,
  currentLocation: Location,
  prevBreadcrumb?: string
) => {
  return isContextRoute ? prevBreadcrumb : '#' + currentLocation.pathname + currentLocation.search;
};

export const useMainRouteBreadcrumb = () => {
  // useRef needed to retrieve initial breadcrumb link from the push state without updates
  return useRef(useHistory<HistoryState>().location.state?.breadcrumb).current;
};

export const useNavigationProps = ({
  indexPatternId,
  rowIndex,
  rowId,
  columns,
  filterManager,
  addBasePath,
}: UseNavigationProps) => {
  const history = useHistory<HistoryState>();
  const currentLocation = useDiscoverServices().history().location;

  const prevBreadcrumb = useRef(history?.location.state?.breadcrumb).current;
  const contextSearchHash = useMemo(
    () => getContextHash(columns, filterManager),
    [columns, filterManager]
  );

  /**
   * When history can be accessed via hooks,
   * it is discover main or context route.
   */
  if (!!history) {
    const isContextRoute = matchPath(history.location.pathname, {
      path: '/context/:indexPatternId/:id',
      exact: true,
    });

    const onOpenSingleDoc = () => {
      history.push({
        pathname: `/doc/${indexPatternId}/${rowIndex}`,
        search: `?id=${encodeURIComponent(rowId)}`,
        state: {
          breadcrumb: getCurrentBreadcrumbs(!!isContextRoute, currentLocation, prevBreadcrumb),
        },
      });
    };

    const onOpenSurrDocs = () =>
      history.push({
        pathname: `/context/${encodeURIComponent(indexPatternId)}/${encodeURIComponent(
          String(rowId)
        )}`,
        search: `?${contextSearchHash}`,
        state: {
          breadcrumb: getCurrentBreadcrumbs(!!isContextRoute, currentLocation, prevBreadcrumb),
        },
      });

    return {
      singleDocProps: { onClick: onOpenSingleDoc },
      surrDocsProps: { onClick: onOpenSurrDocs },
    };
  }

  // for embeddable absolute href should be kept
  return {
    singleDocProps: {
      href: addBasePath(
        `/app/discover#/doc/${indexPatternId}/${rowIndex}?id=${encodeURIComponent(rowId)}`
      ),
    },
    surrDocsProps: {
      href: addBasePath(
        `/app/discover#/context/${encodeURIComponent(indexPatternId)}/${encodeURIComponent(
          rowId
        )}?${contextSearchHash}`
      ),
    },
  };
};
