/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import memoizeOne from 'memoize-one';
import { LogExplorerChunk } from '../../../types';
import { EntriesService } from '../state_machine';

export type FieldCounts = Record<string, number>;

export const selectFieldCounts = (state: EntriesService['state']) => {
  const { topChunk, bottomChunk } = state.context;

  return memoizedGetFieldCounts(topChunk, bottomChunk);
};

export const memoizedSelectFieldCounts = memoizeOne(selectFieldCounts);

const getFieldCounts = (topChunk: LogExplorerChunk, bottomChunk: LogExplorerChunk) => {
  const entries = [
    ...(topChunk.status === 'loaded' ? topChunk.entries : []),
    ...(bottomChunk.status === 'loaded' ? bottomChunk.entries : []),
  ];

  return entries.reduce<FieldCounts>((fieldCountsAcc, entry) => {
    return Object.keys(entry.flattened).reduce((countsAcc, field) => {
      countsAcc[field] = (countsAcc[field] || 0) + 1;
      return countsAcc;
    }, fieldCountsAcc);
  }, {});
};
const memoizedGetFieldCounts = memoizeOne(getFieldCounts);
