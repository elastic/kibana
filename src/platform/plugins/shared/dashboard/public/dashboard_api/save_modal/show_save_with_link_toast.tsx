/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { coreServices, shareService } from '../../services/kibana_services';

export function showSaveWithLinkToast(savedId: string) {
  const locator = shareService?.url.locators.get(DASHBOARD_APP_LOCATOR);
  const url = locator?.getRedirectUrl({ dashboardId: savedId });

  coreServices.notifications.toasts.addSuccess({
    title: i18n.translate('dashboard.savedWithLinkToastTitle', {
      defaultMessage: 'Dashboard saved',
    }),
    text: toMountPoint(
      <FormattedMessage
        id="dashboard.savedWithLinkToastText"
        defaultMessage="{link} in the Dashboards app"
        values={{ link: <EuiLink href={url}>Open</EuiLink> }}
      />,
      coreServices
    ),
    'data-test-subj': 'saveDashboardSuccessWithLink',
  });
}
