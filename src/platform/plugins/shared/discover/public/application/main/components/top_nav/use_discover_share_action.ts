/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderShareAction } from '@kbn/app-header';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DataTotalHitsMsg } from '../../state_management/discover_data_state_container';
import type { RuntimeStateManager, TabState } from '../../state_management/redux';
import type { DiscoverServices } from '../../../../build_services';
import type { AppMenuDiscoverParams } from './app_menu_actions';
import { buildShareOptions } from './app_menu_actions/get_share';

/**
 * Discover-owned Share action for App Header title placement and menu adaptation.
 * Returns `undefined` when the Share plugin is unavailable.
 */
export const useDiscoverShareAction = ({
  discoverParams,
  services,
  currentTab,
  runtimeStateManager,
  persistedDiscoverSession,
  totalHitsState,
  hasUnsavedChanges,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  currentTab: TabState;
  runtimeStateManager: RuntimeStateManager;
  persistedDiscoverSession: DiscoverSession | undefined;
  totalHitsState: DataTotalHitsMsg;
  hasUnsavedChanges: boolean;
}): AppHeaderShareAction | undefined => {
  const onClick = useCallback(
    async ({
      triggerElement,
      returnFocus,
    }: {
      triggerElement: HTMLElement;
      returnFocus: () => void;
    }) => {
      const shareOptions = await buildShareOptions({
        discoverParams,
        services,
        currentTab,
        runtimeStateManager,
        persistedDiscoverSession,
        totalHitsState,
        hasUnsavedChanges,
      });
      services.share?.toggleShareContextMenu({
        ...shareOptions,
        anchorElement: triggerElement,
        onClose: returnFocus,
      });
    },
    [
      discoverParams,
      services,
      currentTab,
      runtimeStateManager,
      persistedDiscoverSession,
      totalHitsState,
      hasUnsavedChanges,
    ]
  );

  return useMemo((): AppHeaderShareAction | undefined => {
    if (!services.share) {
      return undefined;
    }

    return {
      onClick,
      tooltip: {
        content: i18n.translate('discover.localMenu.shareTooltip', {
          defaultMessage: 'Share session',
        }),
      },
    };
  }, [onClick, services.share]);
};
