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

export type DiscoverTopNavProps = Pick<
  DiscoverProps,
  'indexPattern' | 'updateQuery' | 'state' | 'opts'
> & { onOpenInspector: () => void };

export const DiscoverTopNav = ({
  indexPattern,
  opts,
  onOpenInspector,
  state,
  updateQuery,
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
      }),
    [indexPattern, opts, onOpenInspector]
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
      query={state.query}
      setMenuMountPoint={opts.setHeaderActionMenu}
      savedQueryId={state.savedQuery}
      screenTitle={opts.savedSearch.title}
      showDatePicker={showDatePicker}
      showSaveQuery={!!opts.services.capabilities.discover.saveQuery}
      showSearchBar={true}
      useDefaultBehaviors={true}
    />
  );
};
