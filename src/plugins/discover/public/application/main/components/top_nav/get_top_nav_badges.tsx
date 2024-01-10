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
import { onSaveSearch } from './on_save_search';
import { DiscoverServices } from '../../../../build_services';

/**
 * Helper function to build the top nav badges
 */
export const getTopNavBadges = ({
  hasUnsavedChanges,
  stateContainer,
  services,
  topNavCustomization,
}: {
  hasUnsavedChanges: boolean | undefined;
  stateContainer: DiscoverStateContainer;
  services: DiscoverServices;
  topNavCustomization: TopNavCustomization | undefined;
}): TopNavMenuBadgeProps[] => {
  const saveSearch = (initialCopyOnSave?: boolean) =>
    onSaveSearch({
      initialCopyOnSave,
      savedSearch: stateContainer.savedSearchState.getState(),
      services,
      state: stateContainer,
    });

  const defaultBadges = topNavCustomization?.defaultBadges;
  const entries = [...(topNavCustomization?.getBadges?.() ?? [])];

  if (hasUnsavedChanges && !defaultBadges?.unsavedChangesBadge?.disabled) {
    entries.push({
      data: getTopNavUnsavedChangesBadge({
        onRevert: stateContainer.actions.undoSavedSearchChanges,
        onSave: async () => {
          await saveSearch();
        },
        onSaveAs: async () => {
          await saveSearch(true);
        },
      }),
      order: defaultBadges?.unsavedChangesBadge?.order ?? 100,
    });
  }

  return entries.sort((a, b) => a.order - b.order).map((entry) => entry.data);
};
