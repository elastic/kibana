/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { useInspector } from '../../hooks/use_inspector';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { getTopNavBadges } from './get_top_nav_badges';
import { useTopNavLinks } from './use_top_nav_links';
import {
  useAdHocDataViews,
  useCurrentDataView,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useHasShareIntegration } from '../../hooks/use_has_share_integration';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';

/** Standalone Discover with tabs: Inspect is on the tab menu, not the top nav. */
export const isDiscoverInspectorInTabMenu = (
  services: DiscoverServices,
  customizationContext: DiscoverCustomizationContext
) =>
  !services.embeddableEditor.isByValueEditor() && customizationContext.displayMode === 'standalone';

const useDiscoverTopNavShared = ({
  persistedDiscoverSession,
}: {
  persistedDiscoverSession: DiscoverSession | undefined;
}) => {
  const services = useDiscoverServices();
  const hasUnsavedChanges = useInternalStateSelector((state) => state.hasUnsavedChanges);
  const isMobile = useIsWithinBreakpoints(['xs']);

  const topNavBadges = useMemo(
    () =>
      getTopNavBadges({
        isMobile,
        isManaged: Boolean(persistedDiscoverSession?.managed),
        services,
      }),
    [services, isMobile, persistedDiscoverSession?.managed]
  );

  const dataView = useCurrentDataView();
  const adHocDataViews = useAdHocDataViews();
  const isEsqlMode = useIsEsqlMode();
  const hasShareIntegration = useHasShareIntegration(services);

  return {
    services,
    dataView,
    adHocDataViews,
    hasUnsavedChanges,
    isEsqlMode,
    hasShareIntegration,
    topNavBadges,
  };
};

/** Embedded / by-value: top nav shows Inspect; mounts {@link useInspector}. */
export const useDiscoverTopNavWithInspector = ({
  persistedDiscoverSession,
}: {
  persistedDiscoverSession: DiscoverSession | undefined;
}) => {
  const shared = useDiscoverTopNavShared({ persistedDiscoverSession });
  const onOpenInspector = useInspector({ inspector: shared.services.inspector });

  const topNavMenu = useTopNavLinks({
    dataView: shared.dataView,
    services: shared.services,
    onOpenInspector,
    hasUnsavedChanges: shared.hasUnsavedChanges,
    isEsqlMode: shared.isEsqlMode,
    adHocDataViews: shared.adHocDataViews,
    hasShareIntegration: shared.hasShareIntegration,
    persistedDiscoverSession,
  });

  return {
    topNavMenu,
    topNavBadges: shared.topNavBadges,
  };
};

/** Standalone tabbed Discover: Inspect is on the tab menu only — do not mount {@link useInspector}. */
export const useDiscoverTopNavWithoutInspector = ({
  persistedDiscoverSession,
}: {
  persistedDiscoverSession: DiscoverSession | undefined;
}) => {
  const shared = useDiscoverTopNavShared({ persistedDiscoverSession });

  const topNavMenu = useTopNavLinks({
    dataView: shared.dataView,
    services: shared.services,
    onOpenInspector: undefined,
    hasUnsavedChanges: shared.hasUnsavedChanges,
    isEsqlMode: shared.isEsqlMode,
    adHocDataViews: shared.adHocDataViews,
    hasShareIntegration: shared.hasShareIntegration,
    persistedDiscoverSession,
  });

  return {
    topNavMenu,
    topNavBadges: shared.topNavBadges,
  };
};

export type DiscoverTopNavHookResult = ReturnType<typeof useDiscoverTopNavWithInspector>;
