/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useEffect, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiScreenReaderLive, EuiSkipLink, useMutationObserver } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { HeaderProps } from './header';

const DEFAULT_TITLE = 'Elastic'; // This may need to be DRYed out with https://github.com/elastic/kibana/blob/main/packages/core/rendering/core-rendering-server-internal/src/views/template.tsx#L34
const SEPARATOR = ' - ';

export const ScreenReaderRouteAnnouncements: FC<{
  breadcrumbs$: HeaderProps['breadcrumbs$'];
}> = ({ breadcrumbs$ }) => {
  const [routeTitle, setRouteTitle] = useState('');
  const fallbackBreadcrumbs = useObservable(breadcrumbs$, []);

  useEffect(() => {
    if (fallbackBreadcrumbs.length) {
      const breadcrumbText: string[] = [];

      // Reverse the breadcrumb title order and ensure we only pick up valid strings
      fallbackBreadcrumbs.reverse().forEach((breadcrumb) => {
        if (typeof breadcrumb.text === 'string') breadcrumbText.push(breadcrumb.text);
      });
      breadcrumbText.push(DEFAULT_TITLE);

      setRouteTitle(breadcrumbText.join(SEPARATOR));
    } else {
      // Don't announce anything during loading states
      setRouteTitle('');
    }
  }, [fallbackBreadcrumbs]);

  return <EuiScreenReaderLive focusRegionOnTextChange>{routeTitle}</EuiScreenReaderLive>;
};

export const SkipToContent = () => {
  const [applicationRef, setApplicationRef] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setApplicationRef(document.querySelector<HTMLElement>('.kbnAppWrapper'));
  }, []);

  // Ensure pages are done loading and `main` is available
  const [shouldRender, setShouldRender] = useState(false);
  const [forceRerender, setForceRerender] = useState(1);
  const prevMainId = useRef<string | undefined>();
  useMutationObserver(
    applicationRef,
    () => {
      const main = document.querySelector('main'); // TODO: This should use `destinationId` once configurable
      if (main) {
        setShouldRender(true);
        // Ensure that rerendered `main`s are targetable between in-app navigation
        if (main.id !== prevMainId.current) {
          setForceRerender(forceRerender + 1);
          prevMainId.current = main.id;
        }
      } else {
        // Don't display a skip link if there's no content found
        setShouldRender(false);
        prevMainId.current = undefined;
      }
    },
    { subtree: true, childList: true }
  );

  return shouldRender ? (
    <EuiSkipLink
      position="fixed"
      overrideLinkBehavior
      destinationId="" // TODO: Allow plugins to configure this - Maps will likely need this
      href={undefined}
      key={forceRerender}
    >
      {i18n.translate('core.ui.primaryNav.skipToContent', {
        defaultMessage: 'Skip to content',
      })}
    </EuiSkipLink>
  ) : null;
};
