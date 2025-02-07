/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiListGroup, EuiListGroupItemProps } from '@elastic/eui';
import { ChromeRecentlyAccessedHistoryItem } from '@kbn/core-chrome-browser';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';

const MAX_RECENTLY_ACCESS_ITEMS = 10;

export interface RecentlyAccessedToolProps {
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  navigateToUrl: (url: string) => void;
}

export const RecentlyAccessedTool = ({
  recentlyAccessed$,
  navigateToUrl,
}: RecentlyAccessedToolProps) => {
  const recentlyAccessed = useObservable(recentlyAccessed$, []);

  const items: EuiListGroupItemProps[] = recentlyAccessed
    .slice(0, MAX_RECENTLY_ACCESS_ITEMS)
    .map(({ label, link: href }) => ({
      label,
      href,
      color: 'primary',
      iconType: 'clock',
      onClick: (e) => {
        e.preventDefault();
        navigateToUrl(href);
      },
    }));
  return <EuiListGroup listItems={items} size="s" gutterSize="none" />;
};
