/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppHeaderBack } from './types';
import type { BackNavigation } from './back_button';

const EMPTY: BackNavigation[] = [];

/**
 * Converts presentation-ready back props into back-button targets. `href` is used as-is;
 * base-path prefixing belongs in the connected adapter.
 */
export const toBackTargets = (
  back: AppHeaderBack | AppHeaderBack[] | undefined
): BackNavigation[] => {
  if (!back) {
    return EMPTY;
  }

  const backItems = Array.isArray(back) ? back : [back];
  const targets: BackNavigation[] = [];

  for (const item of backItems) {
    const href = item.href?.trim();
    if (!href) {
      continue;
    }
    targets.push({
      backHref: href,
      backOnClick: item.onClick,
      backDestinationLabel: item.label,
    });
  }

  return targets.length > 0 ? targets : EMPTY;
};
