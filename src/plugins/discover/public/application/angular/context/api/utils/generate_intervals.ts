/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SortDirection } from '../../../../../../../data/public';

export type IntervalValue = number | null;

/**
 * Generate a sequence of pairs from the iterable that looks like
 * `[[x_0, x_1], [x_1, x_2], [x_2, x_3], ..., [x_(n-1), x_n]]`.
 */
export function* asPairs(iterable: Iterable<IntervalValue>): IterableIterator<IntervalValue[]> {
  let currentPair: IntervalValue[] = [];
  for (const value of iterable) {
    currentPair = [...currentPair, value].slice(-2);
    if (currentPair.length === 2) {
      yield currentPair;
    }
  }
}

/**
 * Returns a iterable containing intervals `[start,end]` for Elasticsearch date range queries
 * depending on type (`successors` or `predecessors`) and sort (`asc`, `desc`) these are ascending or descending intervals.
 */
export function generateIntervals(
  offsets: number[],
  startTime: number,
  type: string,
  sort: SortDirection
): IterableIterator<IntervalValue[]> {
  const offsetSign =
    (sort === SortDirection.asc && type === 'successors') ||
    (sort === SortDirection.desc && type === 'predecessors')
      ? 1
      : -1;
  // ending with `null` opens the last interval
  return asPairs([...offsets.map((offset) => startTime + offset * offsetSign), null]);
}
