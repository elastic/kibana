/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';

import { useKibana, toMountPoint } from '../../services/kibana_react';
import { DashboardAppServices } from '../../types';
import { DashboardConstants } from '../..';

let bannerId: string | undefined;

export const DashboardNoMatch = ({ history }: { history: RouteComponentProps['history'] }) => {
  const { services } = useKibana<DashboardAppServices>();

  useEffect(() => {
    services.restorePreviousUrl();
    const { navigated } = services.urlForwarding.navigateToLegacyKibanaUrl(
      history.location.pathname + history.location.search
    );

    if (!navigated) {
      const bannerMessage = i18n.translate('dashboard.noMatchRoute.bannerTitleText', {
        defaultMessage: 'Page not found',
      });

      bannerId = services.core.overlays.banners.replace(
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
          { theme$: services.core.theme.theme$ }
        )
      );

      // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
      setTimeout(() => {
        if (bannerId) {
          services.core.overlays.banners.remove(bannerId);
        }
      }, 15000);

      history.replace(DashboardConstants.LANDING_PAGE_PATH);
    }
  }, [services, history]);

  return null;
};
