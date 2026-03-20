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
import { useDiscoverCustomizationContext } from '../../../../customizations';

export const useDiscoverTopNav = ({
  persistedDiscoverSession,
}: {
  persistedDiscoverSession: DiscoverSession | undefined;
}) => {
  const services = useDiscoverServices();
  const customizationContext = useDiscoverCustomizationContext();
  const hasUnsavedChanges = useInternalStateSelector((state) => state.hasUnsavedChanges);
  const isMobile = useIsWithinBreakpoints(['xs']);
  const onOpenInspector = useInspector({ inspector: services.inspector });

  // When tabs are enabled, the inspector is in the tab menu instead of the top nav
  const tabsEnabled =
    !services.embeddableEditor.isByValueEditor() &&
    customizationContext.displayMode === 'standalone';

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

  const topNavMenu = useTopNavLinks({
    dataView,
    services,
    onOpenInspector: tabsEnabled ? undefined : onOpenInspector,
    hasUnsavedChanges,
    isEsqlMode,
    adHocDataViews,
    hasShareIntegration,
    persistedDiscoverSession,
  });

  return {
    topNavMenu,
    topNavBadges,
  };
};
