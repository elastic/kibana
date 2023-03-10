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

  const { Wrapper: DashboardReduxWrapper } = this.getReduxEmbeddableTools();

  const handle = overlays.openFlyout(
    toMountPoint(
      <DashboardReduxWrapper>
        <DashboardSettings onClose={() => handle.close()} />
      </DashboardReduxWrapper>,
      { theme$ }
    ),
    {
      size: 's',
      'data-test-subj': 'dashboardOptionsFlyout',
    }
  );
}
