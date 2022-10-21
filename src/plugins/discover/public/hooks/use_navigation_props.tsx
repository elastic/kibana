/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MouseEventHandler, useMemo } from 'react';
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
  dataViewId: string;
  rowIndex: string;
  rowId: string;
  columns: string[];
  filterManager: FilterManager;
  addBasePath: (url: string) => string;
}

export const getContextHash = (columns: string[], filterManager: FilterManager) => {
  const globalFilters = filterManager.getGlobalFilters();
  const appFilters = filterManager.getAppFilters();

  return stringify(
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

const getCurrentBreadcrumb = (search: string | undefined) =>
  new URLSearchParams(search).get('breadcrumb') || undefined;

export const useMainRouteBreadcrumb = () => {
  const history = useHistory();
  return useMemo(() => getCurrentBreadcrumb(history.location.search), [history.location.search]);
};

export const useNavigationProps = ({
  dataViewId,
  rowIndex,
  rowId,
  columns,
  filterManager,
  addBasePath,
}: UseNavigationProps) => {
  const history = useHistory();
  const currentLocation = useDiscoverServices().history().location;

  const prevBreadcrumb = useMemo(
    () => getCurrentBreadcrumb(history?.location?.search),
    [history?.location?.search]
  );

  const singleDocHref = addBasePath(
    `/app/discover#/doc/${dataViewId}/${rowIndex}?id=${encodeURIComponent(rowId)}`
  );

  const contextSearchHash = getContextHash(columns, filterManager);

  const surDocsHref = addBasePath(
    `/app/discover#/context/${encodeURIComponent(dataViewId)}/${encodeURIComponent(
      rowId
    )}?${contextSearchHash}`
  );

  /**
   * When history can be accessed via hooks,
   * it's used by discover main or context route.
   */
  if (!!history) {
    const isContextRoute = matchPath(history.location.pathname, {
      path: '/context/:dataViewId/:id',
      exact: true,
    });
    const currentBreadcrumb = encodeURIComponent(
      getCurrentBreadcrumbs(!!isContextRoute, currentLocation, prevBreadcrumb) ?? ''
    );

    const onOpenSingleDoc: MouseEventHandler<HTMLAnchorElement> = (event) => {
      event?.preventDefault?.();

      history.push({
        pathname: `/doc/${dataViewId}/${rowIndex}`,
        search: `?id=${encodeURIComponent(rowId)}&breadcrumb=${currentBreadcrumb}`,
      });
    };

    const onOpenSurrDocs: MouseEventHandler<HTMLAnchorElement> = (event) => {
      event?.preventDefault?.();

      history.push({
        pathname: `/context/${encodeURIComponent(dataViewId)}/${encodeURIComponent(String(rowId))}`,
        search: `?${contextSearchHash}&breadcrumb=${currentBreadcrumb}`,
      });
    };

    return {
      singleDocProps: {
        onClick: onOpenSingleDoc,
        href: `${singleDocHref}&breadcrumb=${currentBreadcrumb}`,
      },
      surrDocsProps: {
        onClick: onOpenSurrDocs,
        href: `${surDocsHref}&breadcrumb=${currentBreadcrumb}`,
      },
    };
  }

  // for embeddable absolute href should be kept
  return {
    singleDocProps: {
      href: singleDocHref,
    },
    surrDocsProps: {
      href: surDocsHref,
    },
  };
};
