/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBasicTableColumn, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { capitalize } from 'lodash';
import { UISession } from '../../../types';

// Helper function: translate an app string to EuiIcon-friendly string
const appToIcon = (app: string) => {
  if (app === 'dashboards') {
    return 'dashboard';
  }
  if (app === 'ml') {
    return 'machineLearning';
  }

  return app;
};

// Helper function: translate an app id to user friendly string
const appToTooltip = (appId: string | undefined) => {
  if (appId === 'ml') {
    return i18n.translate('data.mgmt.searchSessions.table.mlAppName', {
      defaultMessage: 'Machine Learning',
    });
  }
};

export const appIdColumn: EuiBasicTableColumn<UISession> = {
  field: 'appId',
  name: i18n.translate('data.mgmt.searchSessions.table.headerType', {
    defaultMessage: 'App',
  }),
  sortable: true,
  render: (appId: UISession['appId'], { id }) => {
    const app = `${appToIcon(appId)}`;
    return (
      <EuiToolTip content={appToTooltip(appId) ?? capitalize(app)}>
        <EuiIcon
          data-test-subj="sessionManagementAppIcon"
          data-test-app-id={app}
          type={`${app}App`}
        />
      </EuiToolTip>
    );
  },
};
