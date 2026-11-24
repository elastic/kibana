/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortBy } from 'lodash';

interface SerializedHistogram {
  counts: number[];
  values: number[];
  total: number;
  sum: number;
}

class LosslessHistogram {
  private readonly trackedValues: Map<number, number> = new Map();

  record(value: number) {
    this.trackedValues.set(value, 1 + (this.trackedValues.get(value) ?? 0));
  }

  serialize(): SerializedHistogram {
    const values: number[] = [];
    const counts: number[] = [];
    let total = 0;
    let sum = 0;

    let sortedValues: Array<{ value: number; count: number }> = [];

    this.trackedValues.forEach((count, value) => {
      sortedValues.push({ count, value });
    });

    sortedValues = sortBy(sortedValues, ({ value }) => value);

    sortedValues.forEach(({ value, count }) => {
      values.push(value);
      counts.push(count);
      total += count;
      sum += value * count;
    });

    return { values, counts, total, sum };
  }
}

export function createLosslessHistogram() {
  return new LosslessHistogram();
}
