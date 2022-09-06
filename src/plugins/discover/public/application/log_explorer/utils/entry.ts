/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { LogExplorerChunk, LogExplorerEntry } from '../types';
import { getCursorFromHitSort, getPositionFromCursor } from './cursor';

export const getEntryFromHit = ({
  _source,
  ...searchHitWithoutSource
}: SearchHit): LogExplorerEntry => ({
  flattened: searchHitWithoutSource.fields ?? {},
  id: searchHitWithoutSource._id,
  index: searchHitWithoutSource._index,
  position: getPositionFromCursor(getCursorFromHitSort(searchHitWithoutSource.sort)),
  raw: searchHitWithoutSource,
});

export const getEntriesFromChunk = (chunk: LogExplorerChunk): LogExplorerEntry[] =>
  chunk.status === 'loaded' ? chunk.entries : [];

export const areSameEntries =
  (firstEntry: LogExplorerEntry) =>
  (secondEntry: LogExplorerEntry): boolean =>
    firstEntry.id === secondEntry.id && firstEntry.index === secondEntry.index;

export const countAddedEntries = (
  previousEntries: LogExplorerEntry[],
  newEntries: LogExplorerEntry[]
): number => {
  const newestPreviousEntry: LogExplorerEntry | undefined =
    previousEntries[previousEntries.length - 1];

  if (newestPreviousEntry == null) {
    return newEntries.length;
  }

  const indexInNewEntries = newEntries.findIndex(areSameEntries(newestPreviousEntry));

  return newEntries.length - indexInNewEntries - 1;
};
