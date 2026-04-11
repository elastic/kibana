/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { ChromeNextHeaderBadge } from '@kbn/core-chrome-browser/src';
import type { ChromeBadge, ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useNextHeader } from '../../../shared/chrome_hooks';

const breadcrumbsBadgeToHeaderBadge = (badge: ChromeBreadcrumbsBadge): ChromeNextHeaderBadge => ({
  label: badge.badgeText,
  tooltip: badge.toolTipProps?.content as string | undefined,
  // @ts-expect-error supported for backward compatibility. TODO: Remove it
  renderCustomBadge: badge.renderCustomBadge,
});

const legacyBadgeToHeaderBadge = (badge: ChromeBadge): ChromeNextHeaderBadge => ({
  label: badge.text,
  tooltip: badge.tooltip,
});

/**
 * Fallback: `config.badges` from `chrome.next.header.set()` ->
 * legacy `chrome.setBadge()` + `chrome.setBreadcrumbsBadges()` combined.
 */
export function useAppBadges(): ChromeNextHeaderBadge[] | undefined {
  const config = useNextHeader();
  const chrome = useChromeService();
  const breadcrumbsBadges$ = useMemo(() => chrome.getBreadcrumbsBadges$(), [chrome]);
  const breadcrumbsBadges = useObservable(breadcrumbsBadges$, []);
  const legacyBadge$ = useMemo(() => chrome.getBadge$(), [chrome]);
  const legacyBadge = useObservable(legacyBadge$, undefined);

  if (config?.badges) {
    return config.badges;
  }

  const fallback: ChromeNextHeaderBadge[] = [];

  if (legacyBadge) {
    fallback.push(legacyBadgeToHeaderBadge(legacyBadge));
  }

  if (breadcrumbsBadges.length > 0) {
    fallback.push(...breadcrumbsBadges.map(breadcrumbsBadgeToHeaderBadge));
  }

  return fallback.length > 0 ? fallback : undefined;
}
