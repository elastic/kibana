/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut } from '@elastic/eui';

import { RouteComponentProps } from 'react-router-dom';
import { useKibana, toMountPoint } from '../../services/kibana_react';
import { DashboardAppServices } from '../types';
import { DashboardConstants } from '../..';

let bannerId: string | undefined;

export const DashboardNoMatch = ({ history }: { history: RouteComponentProps['history'] }) => {
  const { services } = useKibana<DashboardAppServices>();

  useEffect(() => {
    services.restorePreviousUrl();

    const { navigated } = services.urlForwarding.navigateToLegacyKibanaUrl(
      history.location.pathname
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
          </EuiCallOut>
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
