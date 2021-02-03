/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { NotificationsStart, OverlayRef, OverlayStart } from 'src/core/public';
import { EmbeddableStart } from '../../../../../plugin';
import { toMountPoint } from '../../../../../../../kibana_react/public';
import { IContainer } from '../../../../containers';
import { AddPanelFlyout } from './add_panel_flyout';

export function openAddPanelFlyout(options: {
  embeddable: IContainer;
  getFactory: EmbeddableStart['getEmbeddableFactory'];
  getAllFactories: EmbeddableStart['getEmbeddableFactories'];
  overlays: OverlayStart;
  notifications: NotificationsStart;
  SavedObjectFinder: React.ComponentType<any>;
}): OverlayRef {
  const {
    embeddable,
    getFactory,
    getAllFactories,
    overlays,
    notifications,
    SavedObjectFinder,
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
        SavedObjectFinder={SavedObjectFinder}
      />
    ),
    {
      'data-test-subj': 'dashboardAddPanel',
      ownFocus: true,
    }
  );
  return flyoutSession;
}
