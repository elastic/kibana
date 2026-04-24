/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { AppDeepLinkId, ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { useNextHeader, useProjectBreadcrumbs } from '../../../shared/chrome_hooks';
import { getBreadcrumbPlainText } from '../../../shared/breadcrumb_utils';

const EXCLUDED_BACK_DEEP_LINKS = new Set<AppDeepLinkId>([]);
const EXCLUDED_BACK_HREFS = [/\/app\/management\/?$/];

const isExcludedBackTarget = (crumb: ChromeBreadcrumb): boolean => {
  if (crumb.deepLinkId && EXCLUDED_BACK_DEEP_LINKS.has(crumb.deepLinkId)) {
    return true;
  }
  if (crumb.href) {
    return EXCLUDED_BACK_HREFS.some((re) => re.test(crumb.href!));
  }
  return false;
};

export interface BackNavigation {
  backHref: string;
  backDestinationLabel?: string;
}

const EMPTY: BackNavigation[] = [];

/**
 * Returns all valid back-navigation targets derived from project breadcrumbs
 * (scanning right-to-left, so the immediate parent is first).
 *
 * An explicit `chrome.next.header` `back.href` takes priority and produces a
 * single-element array.
 */
export function useBackButton(): BackNavigation[] {
  const config = useNextHeader();
  const breadcrumbs = useProjectBreadcrumbs();

  return useMemo(() => {
    if (config?.back) {
      const backItems = Array.isArray(config.back) ? config.back : [config.back];
      const explicit = backItems
        .filter((b) => b.href?.trim())
        .map((b) => ({ backHref: b.href, backDestinationLabel: b.label }));
      if (explicit.length > 0) {
        return explicit;
      }
    }

    if (breadcrumbs.length < 2) {
      return EMPTY;
    }

    const targets: BackNavigation[] = [];
    for (let i = breadcrumbs.length - 2; i >= 0; i--) {
      const crumb = breadcrumbs[i];
      const href = crumb.href;
      if (href && !isExcludedBackTarget(crumb)) {
        targets.push({
          backHref: href,
          backDestinationLabel: getBreadcrumbPlainText(crumb),
        });
      }
    }
    return targets.length > 0 ? targets : EMPTY;
  }, [breadcrumbs, config]);
}
