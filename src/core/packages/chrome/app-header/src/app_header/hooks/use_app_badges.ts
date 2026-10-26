/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { ChromeBadge, ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { AppHeaderBadge } from '../../types';

const breadcrumbsBadgeToHeaderBadge = (badge: ChromeBreadcrumbsBadge): AppHeaderBadge => ({
  label: badge.badgeText,
  color: badge.color as AppHeaderBadge['color'],
  tooltip: badge.toolTipProps?.content as string | undefined,
  'data-test-subj': badge['data-test-subj'] as string | undefined,
  renderCustomBadge: badge.renderCustomBadge,
});

const legacyBadgeToHeaderBadge = (badge: ChromeBadge): AppHeaderBadge => ({
  label: badge.text,
  tooltip: badge.tooltip,
});

export function useResolvedBadges(
  propBadges: AppHeaderBadge[] | undefined
): AppHeaderBadge[] | undefined {
  // Explicit app-header badges win. When they are not provided, Chrome Next
  // falls back to legacy badge streams so unmigrated routes keep their badges.
  const chrome = useChromeService();
  const breadcrumbsBadges$ = useMemo(() => chrome.getBreadcrumbsBadges$(), [chrome]);
  const breadcrumbsBadges = useObservable(breadcrumbsBadges$, []);
  const legacyBadge$ = useMemo(() => chrome.getBadge$(), [chrome]);
  const legacyBadge = useObservable(legacyBadge$, undefined);

  if (propBadges !== undefined) {
    return propBadges.length > 0 ? propBadges : undefined;
  }

  const fallback: AppHeaderBadge[] = [];

  if (legacyBadge) {
    fallback.push(legacyBadgeToHeaderBadge(legacyBadge));
  }

  if (breadcrumbsBadges.length > 0) {
    fallback.push(...breadcrumbsBadges.map(breadcrumbsBadgeToHeaderBadge));
  }

  return fallback.length > 0 ? fallback : undefined;
}
