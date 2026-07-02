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
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { Redirect } from 'react-router-dom';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import {
  getDashboardNavigateHashPath,
  isDashboardHashPathname,
  isDiscoverBrowserPath,
} from '../../utils/discover_dashboard_hash_collision';

let bannerId: string | undefined;

const DASHBOARDS_APP_ID = 'dashboards';

export function NotFoundRoute() {
  const services = useDiscoverServices();
  const { urlForwarding, urlTracker, core, history } = services;
  const currentLocation = history.location.pathname;
  const isDashboardHashCollision =
    isDiscoverBrowserPath(window.location.pathname) && isDashboardHashPathname(currentLocation);

  useEffect(() => {
    if (isDashboardHashCollision) {
      void core.application.navigateToApp(DASHBOARDS_APP_ID, {
        path: getDashboardNavigateHashPath(currentLocation, history.location.search),
      });
      return;
    }

    const path = window.location.hash.substr(1);
    urlTracker.restorePreviousUrl();
    urlForwarding.navigateToLegacyKibanaUrl(path);

    const bannerMessage = i18n.translate('discover.noMatchRoute.bannerTitleText', {
      defaultMessage: 'Page not found',
    });

    bannerId = core.overlays.banners.replace(
      bannerId,
      toMountPoint(
        <KbnWarningCallout
          title={bannerMessage}
          text={
            <FormattedMessage
              id="discover.noMatchRoute.bannerText"
              defaultMessage="Discover application doesn't recognize this route: {route}"
              values={{
                route: history.location.state.referrer,
              }}
            />
          }
          data-test-subj="invalidRouteBanner"
        />,
        core
      )
    );

    // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
    setTimeout(() => {
      if (bannerId) {
        core.overlays.banners.remove(bannerId);
      }
    }, 15000);
  }, [
    core,
    currentLocation,
    history,
    history.location.search,
    isDashboardHashCollision,
    urlForwarding,
    urlTracker,
  ]);

  if (isDashboardHashCollision) {
    return <Redirect to="/" />;
  }

  return <Redirect to={{ pathname: '/', state: { referrer: currentLocation } }} />;
}
