/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// @ts-expect-error
import Histogram from 'native-hdr-histogram';

const ONE_HOUR_IN_MICRO_SECONDS = 1000 * 1000 * 60 * 60;

interface SerializedHistogram {
  counts: number[];
  values: number[];
  total: number;
}

class LosslessHistogram {
  private readonly backingHistogram: any;

  private readonly min: number;
  private readonly max: number;

  private trackedValue: number | null = null;
  private trackedCount: number = 0;

  constructor(options?: { min?: number; max?: number }) {
    const { min, max } = options ?? {};
    this.min = min ?? 1;
    this.max = max ?? ONE_HOUR_IN_MICRO_SECONDS;
  }

  private getBackingHistogram() {
    if (this.backingHistogram) {
      return this.backingHistogram;
    }
    const histogram = new Histogram(this.min, this.max);

    if (this.trackedValue !== null) {
      histogram.record(this.trackedValue, this.trackedCount);
    }

    return histogram;
  }

  record(value: number) {
    if ((this.trackedValue !== null && this.trackedValue !== value) || this.backingHistogram) {
      this.getBackingHistogram().record(value);
      return;
    }

    this.trackedValue = value;
    this.trackedCount++;
  }

  serialize(): SerializedHistogram {
    if (this.backingHistogram) {
      const minRecordedValue = this.backingHistogram.min();
      const maxRecordedValue = this.backingHistogram.max();

      const distribution: Array<{ value: number; count: number }> =
        this.backingHistogram.linearcounts(Math.max(1, (maxRecordedValue - minRecordedValue) / 50));

      const values: number[] = [];
      const counts: number[] = [];

      for (const { value, count } of distribution) {
        values.push(value);
        counts.push(count);
      }

      return {
        values,
        counts,
        total: this.backingHistogram.totalCount,
      };
    }

    if (this.trackedValue === null) {
      throw new Error('Tracked value was unexpectedly null');
    }

    return {
      values: [this.trackedValue],
      counts: [this.trackedCount],
      total: this.trackedCount,
    };
  }
}

export function createLosslessHistogram(options?: { min?: number; max?: number }) {
  return new LosslessHistogram(options);
}
