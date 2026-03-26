/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useProjectBreadcrumbs } from '../../shared/chrome_hooks';
import { getBreadcrumbPlainText } from '../../shared/breadcrumb_utils';

export interface BackNavigation {
  backHref: string;
  /** Plain-text title of the root crumb (for `aria-label` on the back control). */
  backDestinationLabel?: string;
}

/**
 * When there are ≥2 project breadcrumbs, exposes the first crumb's `href` for the back control.
 * Returns `undefined` if the root has no `href` (e.g. popover-only crumb).
 */
export function useBackButton(): BackNavigation | undefined {
  const breadcrumbs = useProjectBreadcrumbs();

  const rootCrumb = breadcrumbs.length >= 2 ? breadcrumbs[0] : undefined;
  const backHref = rootCrumb?.href;
  const backDestinationLabel = rootCrumb ? getBreadcrumbPlainText(rootCrumb) : undefined;

  return useMemo(() => {
    if (!backHref) return undefined;
    return { backHref, backDestinationLabel };
  }, [backHref, backDestinationLabel]);
}
