/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import type { AppHeaderBadge } from '@kbn/app-header';
import { discoverTopNavMenuContext } from './discover_topnav_menu';

const chromeBadgeToHeaderBadge = (badge: ChromeBreadcrumbsBadge): AppHeaderBadge => ({
  label: badge.badgeText,
  color: badge.color as AppHeaderBadge['color'],
  tooltip: badge.toolTipProps?.content as string | undefined,
  'data-test-subj': badge['data-test-subj'] as string | undefined,
  renderCustomBadge: badge.renderCustomBadge,
});

export const useTopNavBadgeItems = (): AppHeaderBadge[] | undefined => {
  const { topNavBadges$ } = useContext(discoverTopNavMenuContext);
  const topNavBadges = useObservable(topNavBadges$, topNavBadges$.getValue());

  return useMemo(() => {
    if (!topNavBadges) return undefined;

    return topNavBadges.length > 0 ? topNavBadges.map(chromeBadgeToHeaderBadge) : undefined;
  }, [topNavBadges]);
};
