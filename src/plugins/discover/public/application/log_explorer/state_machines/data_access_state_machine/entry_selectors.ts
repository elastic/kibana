/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogExplorerEntry } from '../../types';
import { DataAccessService } from './state_machine';
import { selectIsReloading } from './status_selectors';

export const selectLoadedEntries = (
  state: DataAccessService['state']
): {
  startRowIndex: number | undefined;
  endRowIndex: number | undefined;
  entries: LogExplorerEntry[];
} => {
  if (selectIsReloading(state)) {
    return {
      startRowIndex: undefined,
      endRowIndex: undefined,
      entries: [],
    };
  }

  const { topChunk, bottomChunk } = state.context;

  // TODO: the zero fallback should never happen, but the typestate is not strict enough
  const startRowIndex = topChunk.status !== 'uninitialized' ? topChunk.rowIndex : 0;
  const endRowIndex =
    bottomChunk.status === 'uninitialized'
      ? 0
      : bottomChunk.status === 'loaded'
      ? bottomChunk.rowIndex + bottomChunk.entries.length - 1
      : bottomChunk.rowIndex;

  return {
    startRowIndex,
    endRowIndex,
    entries: [
      ...(topChunk.status === 'loaded' ? topChunk.entries : []),
      ...(bottomChunk.status === 'loaded' ? bottomChunk.entries : []),
    ],
  };
};
