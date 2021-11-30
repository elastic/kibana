/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useRef } from 'react';
import { useHistory, matchPath } from 'react-router-dom';
import { stringify } from 'query-string';
import rison from 'rison-node';
import { esFilters, FilterManager } from '../../../data/public';
import { url } from '../../../kibana_utils/common';
import { getServices } from '../kibana_services';

export type DiscoverNavigationProps = { onClick: () => void } | { href: string };

const getContextHash = (columns: string[], filterManager: FilterManager) => {
  const globalFilters = filterManager.getGlobalFilters();
  const appFilters = filterManager.getAppFilters();

  const hash = stringify(
    url.encodeQuery({
      _g: rison.encode({
        filters: globalFilters || [],
      }),
      _a: rison.encode({
        columns,
        filters: (appFilters || []).map(esFilters.disableFilter),
      }),
    }),
    { encode: false, sort: false }
  );

  return hash;
};

/**
 * When it's context route, referrer should point to the main discover page anyway.
 * Otherwise, we are on main page and should create referrer from it.
 * Current history object should be used in callback, since url state might be changed
 * after expanded document opened.
 */
const getCurrentReferrer = (isContextRoute: boolean, prevReferrer?: string) => {
  const { history: getHistory } = getServices();
  const currentHistory = getHistory();
  return isContextRoute
    ? prevReferrer
    : '#' + currentHistory?.location.pathname + currentHistory?.location.search;
};

export const useBreadcrumbReffs = ({
  indexPatternId,
  rowIndex,
  rowId,
  columns,
  filterManager,
  addBasePath,
}: {
  indexPatternId: string;
  rowIndex: string;
  rowId: string;
  columns: string[];
  filterManager: FilterManager;
  addBasePath: (url: string) => string;
}) => {
  const history = useHistory();
  const prevReferrer = useRef<string | undefined>(history?.location.state?.referrer).current;
  const contextSearchHash = useMemo(
    () => getContextHash(columns, filterManager),
    [columns, filterManager]
  );

  /**
   * When history can be accessed via hooks,
   * it is discover main or context route
   */
  if (!!history) {
    const isContextRoute = matchPath(history.location.pathname, {
      path: '/context/:indexPatternId/:id',
      exact: true,
    });

    const onOpenSingleDoc = () =>
      history.push({
        pathname: `/doc/${indexPatternId}/${rowIndex}`,
        search: `?id=${encodeURIComponent(rowId)}`,
        state: { referrer: getCurrentReferrer(!!isContextRoute, prevReferrer) },
      });

    const onOpenSurrDocs = () =>
      history.push({
        pathname: `/context/${encodeURIComponent(indexPatternId)}/${encodeURIComponent(
          String(rowId)
        )}`,
        search: `?${contextSearchHash}`,
        state: { referrer: getCurrentReferrer(!!isContextRoute, prevReferrer) },
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
