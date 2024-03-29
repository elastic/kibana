/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { pluginServices } from '../../../services/plugin_services';
import { DashboardSettings } from '../../component/settings/settings_flyout';
import { DashboardContainer, DashboardContainerContext } from '../dashboard_container';

export function showSettings(this: DashboardContainer) {
  const {
    settings: {
      theme: { theme$ },
    },
    overlays,
  } = pluginServices.getServices();

  // TODO Move this action into DashboardContainer.openOverlay
  this.dispatch.setHasOverlays(true);

  this.openOverlay(
    overlays.openFlyout(
      toMountPoint(
        <DashboardContainerContext.Provider value={this}>
          <DashboardSettings
            onClose={() => {
              this.dispatch.setHasOverlays(false);
              this.clearOverlays();
            }}
          />
        </DashboardContainerContext.Provider>,
        { theme$ }
      ),
      {
        size: 's',
        'data-test-subj': 'dashboardSettingsFlyout',
        onClose: (flyout) => {
          this.clearOverlays();
          this.dispatch.setHasOverlays(false);
          flyout.close();
        },
      }
    )
  );
}
