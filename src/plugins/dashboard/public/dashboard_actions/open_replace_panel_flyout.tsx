/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import type {
  IContainer,
  IEmbeddable,
  EmbeddableInput,
  EmbeddableOutput,
} from '@kbn/embeddable-plugin/public';
import { tracksOverlays } from '@kbn/embeddable-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { ReplacePanelFlyout } from './replace_panel_flyout';
import { pluginServices } from '../services/plugin_services';

export async function openReplacePanelFlyout(options: {
  embeddable: IContainer;
  savedObjectFinder: React.ComponentType<any>;
  panelToRemove: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
}) {
  const { embeddable, panelToRemove, savedObjectFinder } = options;

  const {
    settings: {
      theme: { theme$ },
    },
    overlays: { openFlyout },
  } = pluginServices.getServices();

  // send the overlay ref to the root embeddable if it is capable of tracking overlays
  const rootEmbeddable = embeddable.getRoot();
  const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;

  const flyoutSession = openFlyout(
    toMountPoint(
      <ReplacePanelFlyout
        container={embeddable}
        onClose={() => {
          if (flyoutSession) {
            if (overlayTracker) overlayTracker.clearOverlays();

            flyoutSession.close();
          }
        }}
        panelToRemove={panelToRemove}
        savedObjectsFinder={savedObjectFinder}
      />,
      { theme$ }
    ),
    {
      'data-test-subj': 'dashboardReplacePanel',
      ownFocus: true,
      onClose: (overlayRef) => {
        if (overlayTracker) overlayTracker.clearOverlays();
        overlayRef.close();
      },
    }
  );

  overlayTracker?.openOverlay(flyoutSession);
}
