/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TopNavMenuBadgeProps } from '@kbn/navigation-plugin/public';
import { getTopNavUnsavedChangesBadge } from '@kbn/unsaved-changes-badge';
import { getManagedContentBadge } from '@kbn/managed-content-badge';
import { i18n } from '@kbn/i18n';
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

  const isManaged = stateContainer.savedSearchState.getState().managed;

  if (hasUnsavedChanges && !defaultBadges?.unsavedChangesBadge?.disabled) {
    entries.push({
      data: getTopNavUnsavedChangesBadge({
        onRevert: async () => {
          const lensEditFlyoutCancelButton = document.getElementById('lnsCancelEditOnFlyFlyout');
          if (lensEditFlyoutCancelButton) {
            lensEditFlyoutCancelButton.click?.();
          }
          await stateContainer.actions.undoSavedSearchChanges();
        },
        onSave:
          services.capabilities.discover.save && !isManaged
            ? async () => {
                await saveSearch();
              }
            : undefined,
        onSaveAs: services.capabilities.discover.save
          ? async () => {
              await saveSearch(true);
            }
          : undefined,
      }),
      order: defaultBadges?.unsavedChangesBadge?.order ?? 100,
    });
  }

  if (isManaged) {
    entries.push({
      data: getManagedContentBadge(
        i18n.translate('discover.topNav.managedContentLabel', {
          defaultMessage:
            'This saved search is managed by Elastic. Changes here must be saved to a new saved search.',
        })
      ),
      order: 101,
    });
  }

  return entries.sort((a, b) => a.order - b.order).map((entry) => entry.data);
};
