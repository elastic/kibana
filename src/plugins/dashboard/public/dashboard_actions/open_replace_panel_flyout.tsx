/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { tracksOverlays } from '@kbn/presentation-containers';
import { pluginServices } from '../services/plugin_services';
import { ReplacePanelActionApi } from './replace_panel_action';
import { ReplacePanelFlyout } from './replace_panel_flyout';
import { ReplacePanelSOFinder } from '.';

export const openReplacePanelFlyout = async ({
  savedObjectFinder,
  api,
}: {
  savedObjectFinder: ReplacePanelSOFinder;
  api: ReplacePanelActionApi;
}) => {
  const {
    settings: {
      theme: { theme$ },
    },
    overlays: { openFlyout },
  } = pluginServices.getServices();

  // send the overlay ref to the parent if it is capable of tracking overlays
  const overlayTracker = tracksOverlays(api.parentApi) ? api.parentApi : undefined;

  const flyoutSession = openFlyout(
    toMountPoint(
      <ReplacePanelFlyout
        api={api}
        onClose={() => {
          if (flyoutSession) {
            if (overlayTracker) overlayTracker.clearOverlays();
            flyoutSession.close();
          }
        }}
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
};
