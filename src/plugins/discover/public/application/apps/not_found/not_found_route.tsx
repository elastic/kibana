/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Redirect } from 'react-router-dom';
import { toMountPoint } from '../../../../../kibana_react/public';
import { DiscoverServices } from '../../../build_services';
import { getUrlTracker } from '../../../kibana_services';

export interface NotFoundRouteProps {
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}
let bannerId: string | undefined;

export function NotFoundRoute(props: NotFoundRouteProps) {
  const { services } = props;
  const { urlForwarding, core, history } = services;
  const currentLocation = history().location.pathname;

  useEffect(() => {
    const path = window.location.hash.substr(1);
    getUrlTracker().restorePreviousUrl();
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
                route: history().location.state.referrer,
              }}
            />
          </p>
        </EuiCallOut>
      )
    );

    // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
    setTimeout(() => {
      if (bannerId) {
        core.overlays.banners.remove(bannerId);
      }
    }, 15000);
  }, [core.overlays.banners, history, urlForwarding]);

  return <Redirect to={{ pathname: '/', state: { referrer: currentLocation } }} />;
}
