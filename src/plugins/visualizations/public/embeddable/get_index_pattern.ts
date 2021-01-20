/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { VisSavedObject } from '../types';
import type { IndexPattern } from '../../../../plugins/data/public';
import { getIndexPatterns } from '../services';

export async function getIndexPattern(
  savedVis: VisSavedObject
): Promise<IndexPattern | undefined | null> {
  if (savedVis.visState.type !== 'metrics') {
    return savedVis.searchSource!.getField('index');
  }

  const indexPatternsClient = getIndexPatterns();

  return savedVis.visState.params.index_pattern
    ? (await indexPatternsClient.find(`"${savedVis.visState.params.index_pattern}"`))[0]
    : await indexPatternsClient.getDefault();
}
