/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useProfilesEnabled } from '../../../../context_awareness/hooks/use_profiles_enabled';
import { useDiscoverCustomization } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useInspector } from '../../hooks/use_inspector';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { useInternalStateSelector } from '../../state_management/discover_internal_state_container';
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

  const dataView = useInternalStateSelector((state) => state.dataView);
  const adHocDataViews = useInternalStateSelector((state) => state.adHocDataViews);
  const isEsqlMode = useIsEsqlMode();
  const { profilesEnabled, setProfilesEnabled } = useProfilesEnabled();
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
        profilesEnabled,
        setProfilesEnabled,
      }),
    [
      adHocDataViews,
      dataView,
      isEsqlMode,
      onOpenInspector,
      profilesEnabled,
      services,
      setProfilesEnabled,
      stateContainer,
      topNavCustomization,
    ]
  );

  return {
    topNavMenu,
    topNavBadges,
  };
};
