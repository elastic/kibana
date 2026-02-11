/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiSkipLink, EuiLiveAnnouncer, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAIN_CONTENT_SELECTORS } from '@kbn/core-chrome-layout-constants';

import type { HeaderProps } from './header';

const DEFAULT_BRAND = 'Elastic'; // This may need to be DRYed out with https://github.com/elastic/kibana/blob/main/src/core/packages/rendering/server-internal/src/views/template.tsx#L35
const SEPARATOR = ' - ';

export const HeaderPageAnnouncer: FC<{
  breadcrumbs$: HeaderProps['breadcrumbs$'];
  customBranding$: HeaderProps['customBranding$'];
}> = ({ breadcrumbs$, customBranding$ }) => {
  const [routeTitle, setRouteTitle] = useState('');
  const branding = useObservable(customBranding$)?.pageTitle || DEFAULT_BRAND;
  const breadcrumbs = useObservable(breadcrumbs$, []);
  const skipLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [shouldHandleTab, setShouldHandleTab] = useState<boolean>(false);

  useEffect(() => {
    if (!breadcrumbs.length) {
      setRouteTitle('');
      return;
    }

    const breadcrumbText = [...breadcrumbs]
      .reverse()
      .map((breadcrumb) => {
        if (typeof breadcrumb['aria-label'] === 'string') {
          return breadcrumb['aria-label'];
        }

        if (typeof breadcrumb.text === 'string') {
          return breadcrumb.text;
        }

        return null;
      })
      .filter(Boolean) as string[];

    breadcrumbText.push(branding);

    const joinedBreadcrumbs = breadcrumbText.join(SEPARATOR);

    if (routeTitle !== joinedBreadcrumbs) {
      setRouteTitle(joinedBreadcrumbs);
      setShouldHandleTab(true);
    }
  }, [breadcrumbs, branding, routeTitle]);

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = ['keydown', 'mousedown'];

    const handleTabFn: EventListener = (e) => {
      if (shouldHandleTab && e instanceof KeyboardEvent && e.key === keys.TAB) {
        // Only intercept Tab if the user is not already focused within the main content area
        const activeElement = document.activeElement;
        const mainContent = document.querySelector(MAIN_CONTENT_SELECTORS.join(','));
        const isWithinMainContent = mainContent && mainContent.contains(activeElement);

        if (!isWithinMainContent) {
          skipLinkRef.current?.focus();
          e.preventDefault?.();
        }
      }
      setShouldHandleTab(false);
    };

    const removeListeners = () =>
      events.forEach((event) => window.removeEventListener(event, handleTabFn));

    if (shouldHandleTab) {
      events.forEach((event) => window.addEventListener(event, handleTabFn, { once: true }));
    } else {
      removeListeners();
    }
    return removeListeners;
  }, [shouldHandleTab]);

  return (
    <>
      <EuiLiveAnnouncer
        clearAfterMs={false}
        aria-label={i18n.translate('core.ui.pageChangeAnnouncements', {
          defaultMessage: 'Page change announcements',
        })}
      >
        {routeTitle}
      </EuiLiveAnnouncer>

      <EuiSkipLink
        buttonRef={skipLinkRef}
        position="fixed"
        destinationId=""
        fallbackDestination={MAIN_CONTENT_SELECTORS}
        overrideLinkBehavior
        data-test-subj="skipToMainButton"
        role="button"
      >
        {i18n.translate('core.ui.skipToMainButton', {
          defaultMessage: 'Skip to main content',
        })}
      </EuiSkipLink>
    </>
  );
};
