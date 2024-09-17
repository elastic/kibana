/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { toMountPoint } from '@kbn/react-kibana-mount';

import { pluginServices } from '../../../services/plugin_services';
import { DashboardSettings } from '../../component/settings/settings_flyout';
import { DashboardContainer } from '../dashboard_container';
import { DashboardContext } from '../../../dashboard_api/use_dashboard_api';

export function showSettings(this: DashboardContainer) {
  const {
    analytics,
    settings: { i18n, theme },
    overlays,
  } = pluginServices.getServices();

  // TODO Move this action into DashboardContainer.openOverlay
  this.dispatch.setHasOverlays(true);

  this.openOverlay(
    overlays.openFlyout(
      toMountPoint(
        <DashboardContext.Provider value={this}>
          <DashboardSettings
            onClose={() => {
              this.dispatch.setHasOverlays(false);
              this.clearOverlays();
            }}
          />
        </DashboardContext.Provider>,
        { analytics, i18n, theme }
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
