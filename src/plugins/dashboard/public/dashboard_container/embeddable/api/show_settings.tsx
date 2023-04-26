/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { DashboardSettings } from '../../component/settings/settings_flyout';
import { DashboardContainer } from '../dashboard_container';
import { pluginServices } from '../../../services/plugin_services';

export function showSettings(this: DashboardContainer) {
  const {
    settings: {
      theme: { theme$ },
    },
    overlays,
  } = pluginServices.getServices();

  const {
    dispatch,
    Wrapper: DashboardReduxWrapper,
    actions: { setHasOverlays },
  } = this.getReduxEmbeddableTools();

  // TODO Move this action into DashboardContainer.openOverlay
  dispatch(setHasOverlays(true));

  this.openOverlay(
    overlays.openFlyout(
      toMountPoint(
        <DashboardReduxWrapper>
          <DashboardSettings
            onClose={() => {
              dispatch(setHasOverlays(false));
              this.clearOverlays();
            }}
          />
        </DashboardReduxWrapper>,
        { theme$ }
      ),
      {
        size: 's',
        'data-test-subj': 'dashboardSettingsFlyout',
        onClose: (flyout) => {
          this.clearOverlays();
          dispatch(setHasOverlays(false));
          flyout.close();
        },
      }
    )
  );
}
