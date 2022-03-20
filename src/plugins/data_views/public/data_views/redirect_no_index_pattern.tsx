/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CoreStart } from 'kibana/public';
import { toMountPoint } from '../../../kibana_react/public';

let bannerId: string;

export const onRedirectNoIndexPattern =
  (
    capabilities: CoreStart['application']['capabilities'],
    navigateToApp: CoreStart['application']['navigateToApp'],
    overlays: CoreStart['overlays'],
    theme: CoreStart['theme']
  ) =>
  () => {
    const canManageIndexPatterns = capabilities.management.kibana.indexPatterns;
    const redirectTarget = canManageIndexPatterns ? '/management/kibana/dataViews' : '/home';
    let timeoutId: NodeJS.Timeout | undefined;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const bannerMessage = i18n.translate('dataViews.ensureDefaultIndexPattern.bannerLabel', {
      defaultMessage:
        'To visualize and explore data in Kibana, you must create an index pattern to retrieve data from Elasticsearch.',
    });

    // Avoid being hostile to new users who don't have an index pattern setup yet
    // give them a friendly info message instead of a terse error message
    bannerId = overlays.banners.replace(
      bannerId,
      toMountPoint(<EuiCallOut color="warning" iconType="iInCircle" title={bannerMessage} />, {
        theme$: theme.theme$,
      })
    );

    // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
    timeoutId = setTimeout(() => {
      overlays.banners.remove(bannerId);
      timeoutId = undefined;
    }, 15000);

    if (redirectTarget === '/home') {
      navigateToApp('home');
    } else {
      navigateToApp('management', {
        path: `/kibana/indexPatterns?bannerMessage=${bannerMessage}`,
      });
    }

    // return never-resolving promise to stop resolving and wait for the url change
    return new Promise(() => {});
  };
