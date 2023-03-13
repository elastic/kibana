/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiScreenReaderLive } from '@elastic/eui';

import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { HeaderProps } from './header';

const DEFAULT_BRAND = 'Elastic'; // This may need to be DRYed out with https://github.com/elastic/kibana/blob/main/packages/core/rendering/core-rendering-server-internal/src/views/template.tsx#L34
const SEPARATOR = ' - ';

export const ScreenReaderRouteAnnouncements: FC<{
  breadcrumbs$: HeaderProps['breadcrumbs$'];
  customBranding$: HeaderProps['customBranding$'];
  appId$: InternalApplicationStart['currentAppId$'];
}> = ({ breadcrumbs$, customBranding$, appId$ }) => {
  const [routeTitle, setRouteTitle] = useState('');
  const branding = useObservable(customBranding$)?.pageTitle || DEFAULT_BRAND;
  const breadcrumbs = useObservable(breadcrumbs$, []);

  useEffect(() => {
    if (breadcrumbs.length) {
      const breadcrumbText: string[] = [];

      // Reverse the breadcrumb title order and ensure we only pick up valid strings
      [...breadcrumbs].reverse().forEach((breadcrumb) => {
        if (typeof breadcrumb.text === 'string') breadcrumbText.push(breadcrumb.text);
      });
      breadcrumbText.push(branding);

      setRouteTitle(breadcrumbText.join(SEPARATOR));
    } else {
      // Don't announce anything during loading states
      setRouteTitle('');
    }
  }, [breadcrumbs, branding]);

  // 1. Canvas dynamically updates breadcrumbs *and* page title/history on every name onChange,
  // which leads to focus fighting if this is enabled
  // 2. Discover has custom h1 focus behavior on route change, which should probably
  // be removed in favor of this for a more consistent SR experience
  const appId = useObservable(appId$);
  const disableFocusForApps = ['canvas', 'discover'];
  const focusRegionOnTextChange = !disableFocusForApps.includes(appId || '');

  return (
    <EuiScreenReaderLive focusRegionOnTextChange={focusRegionOnTextChange}>
      {routeTitle}
    </EuiScreenReaderLive>
  );
};
