/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { DiscoverLayoutProps } from '../layout/types';
import { getTopNavLinks } from './get_top_nav_links';
import { Query, TimeRange } from '../../../../../../../data/common/query';
import { getHeaderActionMenuMounter } from '../../../../../kibana_services';
import { GetStateReturn } from '../../services/discover_state';
import { LazyLabsFlyout, withSuspense } from '../../../../../../../presentation_util/public';

const LabsFlyout = withSuspense(LazyLabsFlyout, null);

export type DiscoverTopNavProps = Pick<
  DiscoverLayoutProps,
  'indexPattern' | 'navigateTo' | 'savedSearch' | 'services' | 'searchSource'
> & {
  onOpenInspector: () => void;
  query?: Query;
  savedQuery?: string;
  updateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  stateContainer: GetStateReturn;
  resetSavedSearch: () => void;
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
  resetSavedSearch,
}: DiscoverTopNavProps) => {
  const history = useHistory();
  const showDatePicker = useMemo(() => indexPattern.isTimeBased(), [indexPattern]);
  const [isLabsShown, setIsLabsShown] = useState(false);
  const { TopNavMenu } = services.navigation.ui;

  const onOpenSavedSearch = useCallback(
    (newSavedSearchId: string) => {
      if (savedSearch.id && savedSearch.id === newSavedSearchId) {
        resetSavedSearch();
      } else {
        history.push(`/view/${encodeURIComponent(newSavedSearchId)}`);
      }
    },
    [history, resetSavedSearch, savedSearch.id]
  );

  const topNavMenu = useMemo(() => {
    const links = getTopNavLinks({
      indexPattern,
      navigateTo,
      savedSearch,
      services,
      state: stateContainer,
      onOpenInspector,
      searchSource,
      onOpenSavedSearch,
    });

    return [
      {
        id: 'labs',
        label: i18n.translate('discover.localMenu.labs', {
          defaultMessage: 'Labs',
        }),
        description: i18n.translate('discover.localMenu.openLabs', {
          defaultMessage: 'Open Labs for trying out new features',
        }),
        testId: 'openLabsButton',
        run: () => {
          setIsLabsShown(true);
        },
      },
      ...links,
    ];
  }, [
    indexPattern,
    navigateTo,
    savedSearch,
    services,
    stateContainer,
    onOpenInspector,
    searchSource,
    onOpenSavedSearch,
  ]);

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
    <>
      {isLabsShown && <LabsFlyout solutions={['discover']} onClose={() => setIsLabsShown(false)} />}
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
    </>
  );
};
