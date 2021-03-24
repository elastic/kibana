/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo } from 'react';
import { DiscoverProps } from './types';
import { getTopNavLinks } from './top_nav/get_top_nav_links';
import { Query, TimeRange } from '../../../../data/common/query';

export type DiscoverTopNavProps = Pick<DiscoverProps, 'indexPattern' | 'opts' | 'searchSource'> & {
  onOpenInspector: () => void;
  query?: Query;
  savedQuery?: string;
  updateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
};

export const DiscoverTopNav = ({
  indexPattern,
  opts,
  onOpenInspector,
  query,
  savedQuery,
  updateQuery,
  searchSource,
}: DiscoverTopNavProps) => {
  const showDatePicker = useMemo(() => indexPattern.isTimeBased(), [indexPattern]);
  const { TopNavMenu } = opts.services.navigation.ui;
  const topNavMenu = useMemo(
    () =>
      getTopNavLinks({
        getFieldCounts: opts.getFieldCounts,
        indexPattern,
        inspectorAdapters: opts.inspectorAdapters,
        navigateTo: opts.navigateTo,
        savedSearch: opts.savedSearch,
        services: opts.services,
        state: opts.stateContainer,
        onOpenInspector,
        searchSource,
      }),
    [indexPattern, opts, onOpenInspector, searchSource]
  );

  const updateSavedQueryId = (newSavedQueryId: string | undefined) => {
    const { appStateContainer, setAppState } = opts.stateContainer;
    if (newSavedQueryId) {
      setAppState({ savedQuery: newSavedQueryId });
    } else {
      // remove savedQueryId from state
      const newState = {
        ...appStateContainer.getState(),
      };
      delete newState.savedQuery;
      appStateContainer.set(newState);
    }
  };
  return (
    <TopNavMenu
      appName="discover"
      config={topNavMenu}
      indexPatterns={[indexPattern]}
      onQuerySubmit={updateQuery}
      onSavedQueryIdChange={updateSavedQueryId}
      query={query}
      setMenuMountPoint={opts.setHeaderActionMenu}
      savedQueryId={savedQuery}
      screenTitle={opts.savedSearch.title}
      showDatePicker={showDatePicker}
      showSaveQuery={!!opts.services.capabilities.discover.saveQuery}
      showSearchBar={true}
      useDefaultBehaviors={true}
    />
  );
};
