/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TopNavMenuBadgeProps } from '@kbn/navigation-plugin/public';
import { getTopNavUnsavedChangesBadge } from '@kbn/unsaved-changes-badge';
import { DiscoverStateContainer } from '../../services/discover_state';
import type { TopNavCustomization } from '../../../../customizations';

/**
 * Helper function to build the top nav badges
 */
export const getTopNavBadges = ({
  hasUnsavedChanges,
  stateContainer,
  topNavCustomization,
}: {
  hasUnsavedChanges: boolean | undefined;
  stateContainer: DiscoverStateContainer;
  topNavCustomization: TopNavCustomization | undefined;
}): TopNavMenuBadgeProps[] => {
  const badges: TopNavMenuBadgeProps[] = [];

  // TODO: make it customizable

  if (hasUnsavedChanges) {
    badges.push(
      getTopNavUnsavedChangesBadge({ onReset: stateContainer.actions.undoSavedSearchChanges })
    );
  }

  return badges;
};
