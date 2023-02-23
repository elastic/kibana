/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiScreenReaderLive } from '@elastic/eui';

import type { HeaderProps } from './header';

const DEFAULT_TITLE = 'Elastic'; // This may need to be DRYed out with https://github.com/elastic/kibana/blob/main/packages/core/rendering/core-rendering-server-internal/src/views/template.tsx#L34
const SEPARATOR = ' - ';

export const ScreenReaderRouteAnnouncements: FC<{
  breadcrumbs$: HeaderProps['breadcrumbs$'];
}> = ({ breadcrumbs$ }) => {
  const [routeTitle, setRouteTitle] = useState('');
  const breadcrumbs = useObservable(breadcrumbs$, []);

  useCallback(() => {
    if (breadcrumbs.length) {
      const breadcrumbText: string[] = [];

      // Reverse the breadcrumb title order and ensure we only pick up valid strings
      breadcrumbs.reverse().forEach((breadcrumb) => {
        if (typeof breadcrumb.text === 'string') breadcrumbText.push(breadcrumb.text);
      });
      breadcrumbText.push(DEFAULT_TITLE);

      setRouteTitle(breadcrumbText.join(SEPARATOR));
    } else {
      // Don't announce anything during loading states
      setRouteTitle('');
    }
  }, [breadcrumbs]);

  return <EuiScreenReaderLive focusRegionOnTextChange>{routeTitle}</EuiScreenReaderLive>;
};
