/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useDiscoverCustomization } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useInspector } from '../../hooks/use_inspector';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { getTopNavBadges } from './get_top_nav_badges';
import { useTopNavLinks } from './use_top_nav_links';
import {
  useAdHocDataViews,
  useCurrentDataView,
  useInternalStateSelector,
} from '../../state_management/redux';

export const useDiscoverTopNav = ({
  stateContainer,
}: {
  stateContainer: DiscoverStateContainer;
}) => {
  const services = useDiscoverServices();
  const topNavCustomization = useDiscoverCustomization('top_nav');
  const hasDiscoverSessionChanges = useInternalStateSelector(
    (state) => state.editedDiscoverSession !== undefined
  );
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );

  const hasUnsavedChanges = Boolean(hasDiscoverSessionChanges && persistedDiscoverSession);

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
  const savedSearchId = persistedDiscoverSession?.id;

  const shouldShowESQLToDataViewTransitionModal = !savedSearchId || hasDiscoverSessionChanges;
  const dataView = useCurrentDataView();
  const adHocDataViews = useAdHocDataViews();
  const isEsqlMode = useIsEsqlMode();
  const onOpenInspector = useInspector({
    inspector: services.inspector,
    stateContainer,
  });

  const topNavMenu = useTopNavLinks({
    dataView,
    services,
    state: stateContainer,
    onOpenInspector,
    isEsqlMode,
    adHocDataViews,
    topNavCustomization,
    shouldShowESQLToDataViewTransitionModal,
  });

  return {
    topNavMenu,
    topNavBadges,
  };
};
