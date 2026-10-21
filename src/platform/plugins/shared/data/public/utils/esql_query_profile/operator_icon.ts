/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';

/** Maps a shortened operator class to an icon. Unknown classes use a dot. */
export function operatorIconType(title: string): IconType {
  const name = title.toLowerCase();

  if (name.includes('exchange') || name.includes('merge')) {
    return 'merge';
  }
  if (name.includes('reader') || name.includes('source') || name.includes('scan')) {
    return 'search';
  }
  if (name.includes('limit') || name.includes('filter')) {
    return 'filter';
  }
  if (name.includes('aggregat') || name.includes('stats') || name.includes('topn')) {
    return 'stats';
  }
  if (name.includes('eval') || name.includes('project')) {
    return 'compute';
  }
  return 'dot';
}
