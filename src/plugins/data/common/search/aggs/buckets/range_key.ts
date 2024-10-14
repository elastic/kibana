/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const id = Symbol('id');

type Ranges = Array<
  Partial<{
    from: string | number;
    to: string | number;
    label: string;
  }>
>;

export class RangeKey {
  [id]: string;
  gte: string | number;
  lt: string | number;
  label?: string;

  private findCustomLabel(
    from: string | number | undefined | null,
    to: string | number | undefined | null,
    ranges?: Ranges
  ) {
    return (ranges || []).find(
      (range) =>
        ((from == null && range.from == null) || range.from === from) &&
        ((to == null && range.to == null) || range.to === to)
    )?.label;
  }

  constructor(bucket: any, allRanges?: Ranges) {
    this.gte = bucket.from == null ? -Infinity : bucket.from;
    this.lt = bucket.to == null ? +Infinity : bucket.to;
    this.label = this.findCustomLabel(bucket.from, bucket.to, allRanges);

    this[id] = RangeKey.idBucket(bucket);
  }

  static idBucket(bucket: any) {
    return `from:${bucket.from},to:${bucket.to}`;
  }

  toString() {
    return this[id];
  }
}
