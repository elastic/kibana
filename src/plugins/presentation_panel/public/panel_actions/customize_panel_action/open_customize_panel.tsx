/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { core } from '../../kibana_services';
import { CustomizePanelActionApi } from './customize_panel_action';
import { CustomizePanelEditor } from './customize_panel_editor';

export const openCustomizePanelFlyout = ({
  focusOnTitle,
  api,
}: {
  focusOnTitle?: boolean;
  api: CustomizePanelActionApi;
}) => {
  // send the overlay ref to the parent if it is capable of tracking overlays
  const parent = api.parentApi;
  const overlayTracker = tracksOverlays(parent) ? parent : undefined;

  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings: core.uiSettings,
  });

  const handle = core.overlays.openFlyout(
    toMountPoint(
      <KibanaReactContextProvider>
        <CustomizePanelEditor
          focusOnTitle={focusOnTitle}
          api={api}
          onClose={() => {
            if (overlayTracker) overlayTracker.clearOverlays();
            handle.close();
          }}
        />
      </KibanaReactContextProvider>,
      { theme: core.theme, i18n: core.i18n }
    ),
    {
      size: 's',
      'data-test-subj': 'customizePanel',
      onClose: (overlayRef) => {
        if (overlayTracker) overlayTracker.clearOverlays();
        overlayRef.close();
      },
      maxWidth: true,
    }
  );
  overlayTracker?.openOverlay(handle);
};
