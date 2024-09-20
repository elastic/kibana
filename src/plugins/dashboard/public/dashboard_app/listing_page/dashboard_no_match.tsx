/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { LANDING_PAGE_PATH } from '../../dashboard_constants';
import { coreServices, urlForwardingService } from '../../services/kibana_services';
import { useDashboardMountContext } from '../hooks/dashboard_mount_context';

let bannerId: string | undefined;

export const DashboardNoMatch = ({ history }: { history: RouteComponentProps['history'] }) => {
  const { restorePreviousUrl } = useDashboardMountContext();

  useEffect(() => {
    restorePreviousUrl();
    const { navigated } = urlForwardingService.navigateToLegacyKibanaUrl(
      history.location.pathname + history.location.search
    );

    if (!navigated) {
      const bannerMessage = i18n.translate('dashboard.noMatchRoute.bannerTitleText', {
        defaultMessage: 'Page not found',
      });

      bannerId = coreServices.overlays.banners.replace(
        bannerId,
        toMountPoint(
          <EuiCallOut color="warning" iconType="iInCircle" title={bannerMessage}>
            <p>
              <FormattedMessage
                id="dashboard.noMatchRoute.bannerText"
                defaultMessage="Dashboard application doesn't recognize this route: {route}."
                values={{
                  route: history.location.pathname,
                }}
              />
            </p>
          </EuiCallOut>,
          { analytics: coreServices.analytics, i18n: coreServices.i18n, theme: coreServices.theme }
        )
      );

      // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
      setTimeout(() => {
        if (bannerId) {
          coreServices.overlays.banners.remove(bannerId);
        }
      }, 15000);

      history.replace(LANDING_PAGE_PATH);
    }
  }, [restorePreviousUrl, history]);

  return null;
};
