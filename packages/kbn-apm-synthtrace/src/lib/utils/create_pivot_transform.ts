/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

class PivotTransform {
  private readonly trackedValues: Map<string, number[]> = new Map();

  constructor(options?: { groupBy?: string }) {}

  record({ groupBy, value }: { groupBy: string; value: number }) {
    const valueFor = this.trackedValues.get(groupBy);
    this.trackedValues.set(groupBy, [value, ...(valueFor ?? [])]);
    return;
  }

  avg({ key }: { key: string }) {
    const averageMap = new Map();
    this.trackedValues.forEach((values, key) => {
      const sum = values.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / values.length;
      averageMap.set(key, avg);
    });

    return { value: averageMap.get(key), total: this.trackedValues.get(key)?.length };
  }

  rate({ key, type }: { key: string; type: number }) {
    const rateMap = new Map();

    this.trackedValues.forEach((values, key) => {
      const eventCount = values.filter((value) => value === type).length;
      const total = values.length;
      const rate = eventCount / total;
      rateMap.set(key, rate);
    });

    return { value: rateMap.get(key), total: this.trackedValues.get(key)?.length };
  }
}

export function createPivotTransform(options?: { groupBy?: string }) {
  return new PivotTransform(options);
}
