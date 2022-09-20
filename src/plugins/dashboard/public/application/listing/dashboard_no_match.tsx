/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { DashboardConstants } from '../..';
import { pluginServices } from '../../services/plugin_services';
import { useDashboardMountContext } from '../hooks/dashboard_mount_context';

let bannerId: string | undefined;

export const DashboardNoMatch = ({ history }: { history: RouteComponentProps['history'] }) => {
  const { restorePreviousUrl } = useDashboardMountContext();
  const {
    settings: {
      theme: { theme$ },
    },
    overlays: { banners },
    urlForwarding: { navigateToLegacyKibanaUrl },
  } = pluginServices.getServices();

  useEffect(() => {
    restorePreviousUrl();
    const { navigated } = navigateToLegacyKibanaUrl(
      history.location.pathname + history.location.search
    );

    if (!navigated) {
      const bannerMessage = i18n.translate('dashboard.noMatchRoute.bannerTitleText', {
        defaultMessage: 'Page not found',
      });

      bannerId = banners.replace(
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
          { theme$ }
        )
      );

      // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
      setTimeout(() => {
        if (bannerId) {
          banners.remove(bannerId);
        }
      }, 15000);

      history.replace(DashboardConstants.LANDING_PAGE_PATH);
    }
  }, [restorePreviousUrl, navigateToLegacyKibanaUrl, banners, theme$, history]);

  return null;
};
