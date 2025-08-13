/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AppMenuActionPrimary } from '@kbn/discover-utils';
import { AppMenuActionId, AppMenuActionType } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { OpenSearchPanel } from '../open_search_panel';
import { toMountPoint, createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { DiscoverServices } from '../../../../../build_services';

export const getOpenSearchAppMenuItem = ({
  onOpenSavedSearch,
  services,
}: {
  onOpenSavedSearch: (savedSearchId: string) => void;
  services: DiscoverServices;
}): AppMenuActionPrimary => {
  return {
    id: AppMenuActionId.open,
    type: AppMenuActionType.primary,
    controlProps: {
      label: i18n.translate('discover.localMenu.openDiscoverSessionTitle', {
        defaultMessage: 'Open session',
      }),
      iconType: 'folderOpen',
      testId: 'discoverOpenButton',
      onClick: ({ onFinishAction }) => {
        // Close the menu popover immediately
        onFinishAction();
        // Open a standalone flyout detached from the app menu lifecycle
        const { overlays } = services.core;
        const { Provider: KibanaReactContextProvider } = createKibanaReactContext(services);
        const flyoutRef = overlays.openFlyout(
          toMountPoint(
            <KibanaReactContextProvider>
              <OpenSearchPanel
                onClose={() => flyoutRef.close()}
                onOpenSavedSearch={onOpenSavedSearch}
              />
            </KibanaReactContextProvider>,
            services.core
          ),
          { size: 'l', ownFocus: true }
        );
      },
    },
  };
};
