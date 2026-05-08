/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { firstValueFrom } from 'rxjs';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { DASHBOARD_APP_ID } from '../../../common/page_bundle_constants';
import { coreServices } from '../../services/kibana_services';
import { createDashboardEditUrl } from '../../utils/urls';
import { shouldShowOpenDashboardLink } from './should_show_open_dashboard_link';

interface ShowDashboardSavedToastParams {
  /** The id returned by the save call, i.e. the dashboard that was just saved. */
  savedDashboardId: string;
  /**
   * The dashboard the user was viewing/editing when the save started. In the
   * save flow this is `lastSavedId`; `undefined` when creating a new dashboard.
   */
  viewedDashboardId: string | undefined;
  /** The dashboard title to interpolate into the toast message. */
  dashboardTitle: string;
}

/**
 * Renders the dashboard save success toast and, when relevant, attaches a
 * "View dashboard" link that navigates to the saved dashboard. The link is
 * suppressed when the user is already viewing the saved dashboard inside
 * the Dashboard app, where opening it again would be a no-op.
 */
export const showDashboardSavedToast = async ({
  savedDashboardId,
  viewedDashboardId,
  dashboardTitle,
}: ShowDashboardSavedToastParams): Promise<void> => {
  const currentAppId = await firstValueFrom(coreServices.application.currentAppId$);
  const showOpenLink = shouldShowOpenDashboardLink({
    currentAppId,
    viewedDashboardId,
    savedDashboardId,
  });

  coreServices.notifications.toasts.addSuccess({
    title: i18n.translate('dashboard.dashboardWasSavedSuccessMessage', {
      defaultMessage: `Dashboard ''{title}'' was saved`,
      values: { title: dashboardTitle },
    }),
    text: showOpenLink
      ? toMountPoint(
          <EuiLink
            data-test-subj="dashboardSavedToastLink"
            onClick={() =>
              coreServices.application.navigateToApp(DASHBOARD_APP_ID, {
                path: `#${createDashboardEditUrl(savedDashboardId)}`,
              })
            }
          >
            {i18n.translate('dashboard.savedToast.viewDashboardLink', {
              defaultMessage: 'View dashboard',
            })}
          </EuiLink>,
          coreServices
        )
      : undefined,
    className: 'eui-textBreakWord',
    'data-test-subj': 'saveDashboardSuccess',
  });
};
