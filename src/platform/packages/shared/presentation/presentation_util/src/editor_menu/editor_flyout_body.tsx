/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiSpacer } from '@elastic/eui';
import { isOfQueryType, type AggregateQuery, type Filter, type Query } from '@kbn/es-query';
import type { EditorFlyoutSearchBarProps, EditorMenuManager, EditorMenuSubject } from './types';

interface WritablePanelSearchApi {
  query$: EditorMenuSubject<Query | AggregateQuery | undefined>;
  filters$: EditorMenuSubject<Filter[] | undefined>;
  timeRange$: unknown;
  setQuery: (query: Query | undefined) => void;
  setFilters: (filters: Filter[] | undefined) => void;
  setTimeRange: (timeRange: unknown) => void;
  dataViews$?: EditorMenuSubject<object[] | undefined>;
}

const publishesWritablePanelSearch = (api: unknown): api is WritablePanelSearchApi => {
  if (!api || typeof api !== 'object') return false;
  const candidate = api as Record<string, unknown>;
  return (
    candidate.timeRange$ !== undefined &&
    candidate.filters$ !== undefined &&
    candidate.query$ !== undefined &&
    typeof candidate.setTimeRange === 'function' &&
    typeof candidate.setFilters === 'function' &&
    typeof candidate.setQuery === 'function'
  );
};

const emptyQuery: Query = { language: 'kuery', query: '' };

const bodyCss = css({
  '.euiFlyoutBody__overflowContent': {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
});

const searchBarCss = css({
  flexShrink: 0,
});

const contentCss = css({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
});

const readQuery = (api: unknown): Query | undefined => {
  if (!publishesWritablePanelSearch(api)) return undefined;
  const published = api.query$.getValue();
  return isOfQueryType(published) ? published : undefined;
};

/** Flyout body that places the panel search bar above the caller's editor content. */
export const EditorFlyoutBody = ({
  children,
  menuManager,
  SearchBar,
}: {
  children: React.ReactNode;
  menuManager: EditorMenuManager;
  SearchBar: React.ComponentType<EditorFlyoutSearchBarProps>;
}): React.ReactElement => {
  const [api, setApi] = useState(() => menuManager.panelApi$.getValue());
  const searchApi = publishesWritablePanelSearch(api) ? api : undefined;
  const [query, setQuery] = useState<Query | undefined>(() => readQuery(api));
  const [filters, setFilters] = useState<Filter[]>(() =>
    searchApi ? searchApi.filters$.getValue() ?? [] : []
  );
  const [dataViews, setDataViews] = useState<object[]>([]);
  const snapshotRef = useRef<{ query: Query | undefined; filters: Filter[] | undefined } | null>(
    null
  );
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const subscription = menuManager.panelApi$.subscribe(setApi);
    return () => subscription.unsubscribe();
  }, [menuManager]);

  useEffect(() => {
    if (!searchApi) {
      setQuery(undefined);
      setFilters([]);
      setDataViews([]);
      return;
    }
    if (!snapshotRef.current) {
      snapshotRef.current = {
        query: readQuery(searchApi),
        filters: searchApi.filters$.getValue(),
      };
    }
    const syncQuery = () => setQuery(readQuery(searchApi));
    const syncFilters = () => setFilters(searchApi.filters$.getValue() ?? []);
    syncQuery();
    syncFilters();
    const querySubscription = searchApi.query$.subscribe(syncQuery);
    const filtersSubscription = searchApi.filters$.subscribe(syncFilters);
    const dataViews$ = searchApi.dataViews$;
    const dataViewsSubscription = dataViews$
      ? dataViews$.subscribe((next) => setDataViews(next ?? []))
      : undefined;
    if (dataViews$) {
      setDataViews(dataViews$.getValue() ?? []);
    }
    return () => {
      querySubscription.unsubscribe();
      filtersSubscription.unsubscribe();
      dataViewsSubscription?.unsubscribe();
    };
  }, [searchApi]);

  useEffect(() => {
    return () => {
      if (menuManager.isSessionCommitted()) return;
      const snapshot = snapshotRef.current;
      const current = apiRef.current;
      if (!snapshot || !publishesWritablePanelSearch(current)) return;
      current.setQuery(snapshot.query);
      current.setFilters(snapshot.filters);
    };
  }, [menuManager]);

  const applyQuery = (next: Query | undefined) => {
    if (!searchApi) return;
    if (!next || typeof next.query !== 'string' || next.query.trim() === '') {
      searchApi.setQuery(undefined);
      return;
    }
    searchApi.setQuery({ language: next.language, query: next.query });
  };

  return (
    <EuiFlyoutBody css={bodyCss} data-test-subj="editorFlyoutBody">
      {searchApi && (
        <>
          <div css={searchBarCss}>
            <SearchBar
              appName="embeddableEditorFlyout"
              query={query ?? emptyQuery}
              filters={filters}
              indexPatterns={dataViews}
              showQueryInput
              showFilterBar
              showDatePicker={false}
              showSubmitButton
              showSavedQueryControls={false}
              isAutoRefreshDisabled
              useDefaultBehaviors={false}
              disableSubscribingToGlobalDataServices
              onQuerySubmit={({ query: next }) => {
                applyQuery(next && isOfQueryType(next) ? next : undefined);
              }}
              onFiltersUpdated={(next) => {
                searchApi.setFilters(next.length > 0 ? next : undefined);
              }}
              displayStyle="inPage"
              dataTestSubj="editorFlyoutSearchBar"
            />
          </div>
          <EuiSpacer size="l" />
        </>
      )}
      <div css={contentCss}>{children}</div>
    </EuiFlyoutBody>
  );
};
