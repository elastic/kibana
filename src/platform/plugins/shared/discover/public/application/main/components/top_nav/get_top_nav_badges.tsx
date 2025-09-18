/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { TopNavMenuBadgeProps } from '@kbn/navigation-plugin/public';
import { getTopNavUnsavedChangesBadge } from '@kbn/unsaved-changes-badge';
import { getManagedContentBadge } from '@kbn/managed-content-badge';
import { i18n } from '@kbn/i18n';
import { dismissFlyouts, DiscoverFlyouts } from '@kbn/discover-utils';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import type { TopNavCustomization } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
import { SolutionsViewBadge } from './solutions_view_badge';
import { onSaveDiscoverSession } from './save_discover_session';
import { internalStateActions } from '../../state_management/redux';

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
  const saveDiscoverSession = (initialCopyOnSave?: boolean) =>
    onSaveDiscoverSession({
      initialCopyOnSave,
      services,
      state: stateContainer,
    });

  const defaultBadges = topNavCustomization?.defaultBadges;
  const entries: TopNavMenuBadgeProps[] = [];

  const isManaged = stateContainer.savedSearchState.getState().managed;

  if (services.spaces) {
    entries.push({
      badgeText: i18n.translate('discover.topNav.solutionViewTitle', {
        defaultMessage: 'Check out context-aware Discover',
      }),
      renderCustomBadge: ({ badgeText }) => <SolutionsViewBadge badgeText={badgeText} />,
    });
  }

  if (hasUnsavedChanges && !defaultBadges?.unsavedChangesBadge?.disabled) {
    entries.push(
      getTopNavUnsavedChangesBadge({
        onRevert: async () => {
          dismissFlyouts([DiscoverFlyouts.lensEdit]);

          const { persistedDiscoverSession } = stateContainer.internalState.getState();

          if (persistedDiscoverSession) {
            await stateContainer.internalState
              .dispatch(internalStateActions.resetDiscoverSession())
              .unwrap();
          }
        },
        onSave:
          services.capabilities.discover_v2.save && !isManaged
            ? async () => {
                await saveDiscoverSession();
              }
            : undefined,
        onSaveAs: services.capabilities.discover_v2.save
          ? async () => {
              await saveDiscoverSession(true);
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
            'This Discover session is managed by Elastic. Changes here must be saved to a new Discover session.',
        })
      )
    );
  }

  return entries;
};
