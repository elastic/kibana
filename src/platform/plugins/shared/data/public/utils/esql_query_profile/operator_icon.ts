/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';

export type OperatorCategory = 'exchange' | 'source' | 'filter' | 'aggregate' | 'compute' | 'other';

export const OPERATOR_CATEGORIES: readonly OperatorCategory[] = [
  'source',
  'filter',
  'compute',
  'aggregate',
  'exchange',
  'other',
];

/** Groups a shortened operator class by the kind of work it does. */
export function operatorCategory(title: string): OperatorCategory {
  const name = title.toLowerCase();

  if (name.includes('exchange') || name.includes('merge')) {
    return 'exchange';
  }
  if (name.includes('reader') || name.includes('source') || name.includes('scan')) {
    return 'source';
  }
  if (name.includes('limit') || name.includes('filter')) {
    return 'filter';
  }
  if (name.includes('aggregat') || name.includes('stats') || name.includes('topn')) {
    return 'aggregate';
  }
  if (name.includes('eval') || name.includes('project')) {
    return 'compute';
  }
  return 'other';
}

const ICON_BY_CATEGORY: Record<OperatorCategory, IconType> = {
  exchange: 'merge',
  source: 'search',
  filter: 'filter',
  aggregate: 'stats',
  compute: 'compute',
  other: 'dot',
};

/** Maps a shortened operator class to an icon. Unknown classes use a dot. */
export function operatorIconType(title: string): IconType {
  // TopN is a sort plus a limit, so it gets its own icon instead of the aggregation one.
  if (title.toLowerCase().includes('topn')) {
    return 'sortable';
  }
  return ICON_BY_CATEGORY[operatorCategory(title)];
}
