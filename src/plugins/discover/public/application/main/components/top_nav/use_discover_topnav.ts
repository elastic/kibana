/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverCustomization } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useInspector } from '../../hooks/use_inspector';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { useInternalStateSelector } from '../../state_management/discover_internal_state_container';
import {
  useSavedSearch,
  useSavedSearchHasChanged,
} from '../../state_management/discover_state_provider';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { getTopNavBadges } from './get_top_nav_badges';
import { getTopNavLinks } from './get_top_nav_links';

export const useDiscoverTopNav = ({
  stateContainer,
}: {
  stateContainer: DiscoverStateContainer;
}) => {
  const services = useDiscoverServices();
  const topNavCustomization = useDiscoverCustomization('top_nav');
  const hasSavedSearchChanges = useObservable(stateContainer.savedSearchState.getHasChanged$());
  const hasUnsavedChanges = Boolean(
    hasSavedSearchChanges && stateContainer.savedSearchState.getId()
  );

  const topNavBadges = useMemo(
    () =>
      getTopNavBadges({
        stateContainer,
        services,
        hasUnsavedChanges,
        topNavCustomization,
      }),
    [stateContainer, services, hasUnsavedChanges, topNavCustomization]
  );
  const savedSearchId = useSavedSearch().id;
  const savedSearchHasChanged = useSavedSearchHasChanged();
  const shouldShowESQLToDataViewTransitionModal = !savedSearchId || savedSearchHasChanged;
  const dataView = useInternalStateSelector((state) => state.dataView);
  const adHocDataViews = useInternalStateSelector((state) => state.adHocDataViews);
  const isEsqlMode = useIsEsqlMode();
  const onOpenInspector = useInspector({
    inspector: services.inspector,
    stateContainer,
  });

  const topNavMenu = useMemo(
    () =>
      getTopNavLinks({
        dataView,
        services,
        state: stateContainer,
        onOpenInspector,
        isEsqlMode,
        adHocDataViews,
        topNavCustomization,
        shouldShowESQLToDataViewTransitionModal,
      }),
    [
      adHocDataViews,
      dataView,
      isEsqlMode,
      onOpenInspector,
      services,
      stateContainer,
      topNavCustomization,
      shouldShowESQLToDataViewTransitionModal,
    ]
  );

  return {
    topNavMenu,
    topNavBadges,
  };
};
