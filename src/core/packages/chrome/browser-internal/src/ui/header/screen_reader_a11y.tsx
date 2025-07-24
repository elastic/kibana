/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiScreenReaderLive, EuiSkipLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { useChromeObservable } from '../../store';

const DEFAULT_BRAND = 'Elastic'; // This may need to be DRYed out with https://github.com/elastic/kibana/blob/main/src/core/packages/rendering/server-internal/src/views/template.tsx#L35
const SEPARATOR = ' - ';

export const ScreenReaderRouteAnnouncements: FC<{
  breadcrumbs: ChromeBreadcrumb[];
}> = ({ breadcrumbs }) => {
  const [routeTitle, setRouteTitle] = useState('');
  const brandingState = useChromeObservable((state) => state.customBranding$);
  const branding = brandingState?.pageTitle || DEFAULT_BRAND;

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
  const appId = useChromeObservable((state) => state.currentAppId$);
  const disableFocusForApps = ['canvas'];
  const focusRegionOnTextChange = !disableFocusForApps.includes(appId || '');

  return (
    <EuiScreenReaderLive focusRegionOnTextChange={focusRegionOnTextChange}>
      {routeTitle}
    </EuiScreenReaderLive>
  );
};

const fallbackContentQueries = [
  'main', // Ideal target for all plugins using KibanaPageTemplate
  '[role="main"]', // Fallback for plugins using deprecated EuiPageContent
  '.kbnAppWrapper', // Last-ditch fallback for all plugins regardless of page template
];

export const SkipToMainContent = () => {
  return (
    <EuiSkipLink
      position="fixed"
      destinationId="" // TODO: Potentially allow this to be customizable per-plugin
      fallbackDestination={fallbackContentQueries}
      overrideLinkBehavior
      href="" // Render a button
    >
      {i18n.translate('core.ui.skipToMainButton', {
        defaultMessage: 'Skip to main content',
      })}
    </EuiSkipLink>
  );
};
