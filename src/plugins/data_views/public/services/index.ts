/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpStart } from '@kbn/core/public';
import { MatchedItem } from '../types';

export * from './has_data';

export async function getIndices(props: {
  http: HttpStart;
  pattern: string;
  showAllIndices?: boolean;
  isRollupIndex: (indexName: string) => boolean;
}): Promise<MatchedItem[]> {
  const { getIndices: getIndicesLazy } = await import('./get_indices');
  return getIndicesLazy(props);
}
