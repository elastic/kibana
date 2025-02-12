/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Redirect } from 'react-router-dom';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useDiscoverServices } from '../../hooks/use_discover_services';

let bannerId: string | undefined;

export function NotFoundRoute() {
  const services = useDiscoverServices();
  const { urlForwarding, urlTracker, core, history } = services;
  const currentLocation = history.location.pathname;

  useEffect(() => {
    const path = window.location.hash.substr(1);
    urlTracker.restorePreviousUrl();
    urlForwarding.navigateToLegacyKibanaUrl(path);

    const bannerMessage = i18n.translate('discover.noMatchRoute.bannerTitleText', {
      defaultMessage: 'Page not found',
    });

    bannerId = core.overlays.banners.replace(
      bannerId,
      toMountPoint(
        <EuiCallOut color="warning" iconType="iInCircle" title={bannerMessage}>
          <p data-test-subj="invalidRouteMessage">
            <FormattedMessage
              id="discover.noMatchRoute.bannerText"
              defaultMessage="Discover application doesn't recognize this route: {route}"
              values={{
                route: history.location.state.referrer,
              }}
            />
          </p>
        </EuiCallOut>,
        core
      )
    );

    // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
    setTimeout(() => {
      if (bannerId) {
        core.overlays.banners.remove(bannerId);
      }
    }, 15000);
  }, [core, history, urlForwarding, urlTracker]);

  return <Redirect to={{ pathname: '/', state: { referrer: currentLocation } }} />;
}
