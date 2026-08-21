/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { AppHeaderBackTarget } from '@kbn/ui-app-header';
import type { AppHeaderBack } from '../../types';
import { useBasePath } from './chrome';

const hasBasePathPrefix = (href: string, basePath: string): boolean => {
  return href === basePath || href.startsWith(`${basePath}/`);
};

export function useBackNavTargets(
  back: AppHeaderBack | AppHeaderBack[] | undefined
): AppHeaderBackTarget[] | undefined {
  const basePath = useBasePath();

  return useMemo(() => {
    if (!back) {
      return undefined;
    }
    const backItems = Array.isArray(back) ? back : [back];
    const base = basePath.get();
    const explicit: AppHeaderBackTarget[] = [];
    const seenHrefs = new Set<string>();
    for (const b of backItems) {
      const target = typeof b === 'string' ? { href: b } : b;
      const targetHref = target.href?.trim();
      if (!targetHref) {
        continue;
      }
      const href =
        base && hasBasePathPrefix(targetHref, base) ? targetHref : basePath.prepend(targetHref);
      if (seenHrefs.has(href)) {
        continue;
      }
      seenHrefs.add(href);
      explicit.push({
        href,
        onClick: target.onClick,
        label: target.label,
      });
    }
    return explicit.length > 0 ? explicit : undefined;
  }, [back, basePath]);
}
