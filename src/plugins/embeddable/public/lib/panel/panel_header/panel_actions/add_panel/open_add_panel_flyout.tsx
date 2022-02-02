/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { NotificationsStart, OverlayRef, OverlayStart, ThemeServiceStart } from 'src/core/public';
import { EmbeddableStart } from '../../../../../plugin';
import { toMountPoint } from '../../../../../../../kibana_react/public';
import { IContainer } from '../../../../containers';
import { AddPanelFlyout } from './add_panel_flyout';
import { UsageCollectionStart } from '../../../../../../../usage_collection/public';

export function openAddPanelFlyout(options: {
  embeddable: IContainer;
  getFactory: EmbeddableStart['getEmbeddableFactory'];
  getAllFactories: EmbeddableStart['getEmbeddableFactories'];
  overlays: OverlayStart;
  notifications: NotificationsStart;
  SavedObjectFinder: React.ComponentType<any>;
  showCreateNewMenu?: boolean;
  reportUiCounter?: UsageCollectionStart['reportUiCounter'];
  theme: ThemeServiceStart;
}): OverlayRef {
  const {
    embeddable,
    getFactory,
    getAllFactories,
    overlays,
    notifications,
    SavedObjectFinder,
    showCreateNewMenu,
    reportUiCounter,
    theme,
  } = options;
  const flyoutSession = overlays.openFlyout(
    toMountPoint(
      <AddPanelFlyout
        container={embeddable}
        onClose={() => {
          if (flyoutSession) {
            flyoutSession.close();
          }
        }}
        getFactory={getFactory}
        getAllFactories={getAllFactories}
        notifications={notifications}
        reportUiCounter={reportUiCounter}
        SavedObjectFinder={SavedObjectFinder}
        showCreateNewMenu={showCreateNewMenu}
      />,
      { theme$: theme.theme$ }
    ),
    {
      'data-test-subj': 'dashboardAddPanel',
      ownFocus: true,
    }
  );
  return flyoutSession;
}
