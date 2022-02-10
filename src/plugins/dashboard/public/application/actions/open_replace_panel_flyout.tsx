/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { toMountPoint } from '../../services/kibana_react';
import { ReplacePanelFlyout } from './replace_panel_flyout';
import {
  IContainer,
  IEmbeddable,
  EmbeddableStart,
  EmbeddableInput,
  EmbeddableOutput,
} from '../../services/embeddable';

export async function openReplacePanelFlyout(options: {
  embeddable: IContainer;
  core: CoreStart;
  savedObjectFinder: React.ComponentType<any>;
  notifications: CoreStart['notifications'];
  panelToRemove: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  getEmbeddableFactories: EmbeddableStart['getEmbeddableFactories'];
}) {
  const {
    embeddable,
    core,
    panelToRemove,
    savedObjectFinder,
    notifications,
    getEmbeddableFactories,
  } = options;
  const flyoutSession = core.overlays.openFlyout(
    toMountPoint(
      <ReplacePanelFlyout
        container={embeddable}
        onClose={() => {
          if (flyoutSession) {
            flyoutSession.close();
          }
        }}
        panelToRemove={panelToRemove}
        savedObjectsFinder={savedObjectFinder}
        notifications={notifications}
        getEmbeddableFactories={getEmbeddableFactories}
      />,
      { theme$: core.theme.theme$ }
    ),
    {
      'data-test-subj': 'dashboardReplacePanel',
      ownFocus: true,
    }
  );
}
