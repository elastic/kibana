/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TopNavMenuBadgeProps } from '@kbn/navigation-plugin/public';
import { getTopNavUnsavedChangesBadge } from '@kbn/unsaved-changes-badge';
import { getManagedContentBadge } from '@kbn/managed-content-badge';
import { i18n } from '@kbn/i18n';
import { dismissFlyouts, DiscoverFlyouts } from '@kbn/discover-utils';
import { DiscoverStateContainer } from '../../state_management/discover_state';
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
  const entries: TopNavMenuBadgeProps[] = [];

  const isManaged = stateContainer.savedSearchState.getState().managed;

  if (hasUnsavedChanges && !defaultBadges?.unsavedChangesBadge?.disabled) {
    entries.push(
      getTopNavUnsavedChangesBadge({
        onRevert: async () => {
          dismissFlyouts([DiscoverFlyouts.lensEdit]);
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
      })
    );
  }

  if (isManaged) {
    entries.push(
      getManagedContentBadge(
        i18n.translate('discover.topNav.managedContentLabel', {
          defaultMessage:
            'This Discover Session is managed by Elastic. Changes here must be saved to a new Discover Session.',
        })
      )
    );
  }

  return entries;
};
