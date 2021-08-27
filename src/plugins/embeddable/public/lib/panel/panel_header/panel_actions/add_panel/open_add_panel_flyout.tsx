/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { NotificationsStart } from '../../../../../../../../core/public/notifications/notifications_service';
import type { OverlayStart } from '../../../../../../../../core/public/overlays/overlay_service';
import type { OverlayRef } from '../../../../../../../../core/public/overlays/types';
import { toMountPoint } from '../../../../../../../kibana_react/public/util/to_mount_point';
import type { UsageCollectionStart } from '../../../../../../../usage_collection/public/plugin';
import type { EmbeddableStart } from '../../../../../plugin';
import type { IContainer } from '../../../../containers/i_container';
import { AddPanelFlyout } from './add_panel_flyout';

export function openAddPanelFlyout(options: {
  embeddable: IContainer;
  getFactory: EmbeddableStart['getEmbeddableFactory'];
  getAllFactories: EmbeddableStart['getEmbeddableFactories'];
  overlays: OverlayStart;
  notifications: NotificationsStart;
  SavedObjectFinder: React.ComponentType<any>;
  showCreateNewMenu?: boolean;
  reportUiCounter?: UsageCollectionStart['reportUiCounter'];
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
      />
    ),
    {
      'data-test-subj': 'dashboardAddPanel',
      ownFocus: true,
    }
  );
  return flyoutSession;
}
