/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { TopNavMenuBadge } from '@kbn/navigation-plugin/public';
import { getTopNavUnsavedChangesBadge } from '@kbn/unsaved-changes-badge';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverStateContainer } from '../../services/discover_state';
import type { TopNavCustomization } from '../../../../customizations';

/**
 * Helper function to build the top nav badges
 */
export const getTopNavBadges = ({
  dataView,
  services,
  state,
  isPlainRecord,
  adHocDataViews,
  topNavCustomization,
}: {
  dataView: DataView;
  services: DiscoverServices;
  state: DiscoverStateContainer;
  isPlainRecord: boolean;
  adHocDataViews: DataView[];
  topNavCustomization: TopNavCustomization | undefined;
}): TopNavMenuBadge[] => {
  const badges: TopNavMenuBadge[] = [];

  // TODO: make it customizable

  badges.push(getTopNavUnsavedChangesBadge({ onReset: async () => {} }));

  return badges;
};
