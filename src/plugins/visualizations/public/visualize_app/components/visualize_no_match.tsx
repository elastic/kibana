/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import { useKibana, toMountPoint, KibanaThemeProvider } from '../../../../kibana_react/public';
import { VisualizeServices } from '../types';
import { VisualizeConstants } from '../../../common/constants';

let bannerId: string;

export const VisualizeNoMatch = () => {
  const { services } = useKibana<VisualizeServices>();

  useEffect(() => {
    services.restorePreviousUrl();

    const { navigated } = services.urlForwarding.navigateToLegacyKibanaUrl(
      services.history.location.pathname + services.history.location.search
    );

    if (!navigated) {
      const bannerMessage = i18n.translate('visualizations.noMatchRoute.bannerTitleText', {
        defaultMessage: 'Page not found',
      });

      bannerId = services.overlays.banners.replace(
        bannerId,
        toMountPoint(
          <KibanaThemeProvider theme$={services.theme.theme$}>
            <EuiCallOut color="warning" iconType="iInCircle" title={bannerMessage}>
              <p>
                <FormattedMessage
                  id="visualizations.noMatchRoute.bannerText"
                  defaultMessage="Visualize application doesn't recognize this route: {route}."
                  values={{
                    route: (
                      <EuiLink href={window.location.href}>
                        {services.history.location.pathname}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiCallOut>
          </KibanaThemeProvider>
        )
      );

      // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
      setTimeout(() => {
        services.overlays.banners.remove(bannerId);
      }, 15000);

      services.history.replace(VisualizeConstants.LANDING_PAGE_PATH);
    }
  }, [services]);

  return null;
};
