/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DiscoverLayoutProps } from '../layout/types';
import { getTopNavLinks } from './get_top_nav_links';
import { Query, TimeRange } from '../../../../../../../data/common/query';
import { getHeaderActionMenuMounter } from '../../../../../kibana_services';
import { GetStateReturn } from '../../services/discover_state';
import { TopNavMenuData } from '../../../../../../../navigation/public';

export type DiscoverTopNavProps = Pick<
  DiscoverLayoutProps,
  'indexPattern' | 'navigateTo' | 'savedSearch' | 'services' | 'searchSource'
> & {
  onOpenInspector: () => void;
  query?: Query;
  savedQuery?: string;
  updateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  stateContainer: GetStateReturn;
  columns: string[];
};

export const DiscoverTopNav = ({
  indexPattern,
  onOpenInspector,
  query,
  savedQuery,
  stateContainer,
  updateQuery,
  searchSource,
  navigateTo,
  savedSearch,
  services,
  columns,
}: DiscoverTopNavProps) => {
  const [registeredTopNavLinks, setRegisteredTopNavLinks] = useState<TopNavMenuData[]>([]);
  const showDatePicker = useMemo(() => indexPattern.isTimeBased(), [indexPattern]);
  const { TopNavMenu } = services.navigation.ui;

  useEffect(() => {
    let unmounted = false;

    const loadRegisteredTopNavLinks = async () => {
      if (services?.addTopNavData) {
        const callbacks = services.addTopNavData.getTopNavLinkGetters();
        const params = {
          indexPattern,
          onOpenInspector,
          query,
          savedQuery,
          stateContainer,
          updateQuery,
          searchSource,
          navigateTo,
          savedSearch,
          services,
          columns,
        };
        const links = await Promise.all(
          callbacks.map((cb) => {
            return cb(params);
          })
        );
        if (!unmounted) {
          setRegisteredTopNavLinks(links);
        }
      }
    };
    loadRegisteredTopNavLinks();

    return () => {
      unmounted = true;
    };
  }, [
    services?.addTopNavData,
    indexPattern,
    onOpenInspector,
    query,
    savedQuery,
    stateContainer,
    updateQuery,
    searchSource,
    navigateTo,
    savedSearch,
    services,
    columns,
  ]);

  const topNavMenu = useMemo(
    () => [
      ...getTopNavLinks({
        indexPattern,
        navigateTo,
        savedSearch,
        services,
        state: stateContainer,
        onOpenInspector,
        searchSource,
      }),
      ...registeredTopNavLinks,
    ],
    [
      indexPattern,
      navigateTo,
      onOpenInspector,
      searchSource,
      stateContainer,
      savedSearch,
      services,
      registeredTopNavLinks,
    ]
  );

  const updateSavedQueryId = (newSavedQueryId: string | undefined) => {
    const { appStateContainer, setAppState } = stateContainer;
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
  const setMenuMountPoint = useMemo(() => {
    return getHeaderActionMenuMounter();
  }, []);

  return (
    <TopNavMenu
      appName="discover"
      config={topNavMenu}
      indexPatterns={[indexPattern]}
      onQuerySubmit={updateQuery}
      onSavedQueryIdChange={updateSavedQueryId}
      query={query}
      setMenuMountPoint={setMenuMountPoint}
      savedQueryId={savedQuery}
      screenTitle={savedSearch.title}
      showDatePicker={showDatePicker}
      showSaveQuery={!!services.capabilities.discover.saveQuery}
      showSearchBar={true}
      useDefaultBehaviors={true}
    />
  );
};
