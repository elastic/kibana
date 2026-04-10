/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useNextHeader, useProjectBreadcrumbs } from '../../../shared/chrome_hooks';
import { getBreadcrumbPlainText } from '../../../shared/breadcrumb_utils';

export interface BackNavigation {
  backHref: string;
  backDestinationLabel?: string;
}

export function useBackButton(): BackNavigation | undefined {
  const config = useNextHeader();
  const breadcrumbs = useProjectBreadcrumbs();

  return useMemo(() => {
    const explicitHref = config?.back?.href?.trim();
    if (explicitHref) {
      return {
        backHref: explicitHref,
        backDestinationLabel: config?.back?.label,
      };
    }

    if (breadcrumbs.length < 2) {
      return undefined;
    }
    for (let i = breadcrumbs.length - 2; i >= 0; i--) {
      const crumb = breadcrumbs[i];
      const href = crumb.href;
      if (href) {
        return {
          backHref: href,
          backDestinationLabel: getBreadcrumbPlainText(crumb),
        };
      }
    }
    return undefined;
  }, [breadcrumbs, config]);
}
