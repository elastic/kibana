/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableField } from '../../../serializable_field';
import { SerializableType } from '../../../serialize_utils';

type Ranges = Array<
  Partial<{
    from: string | number;
    to: string | number;
    label: string;
  }>
>;

type RangeValue = string | number | undefined | null;
interface BucketLike {
  from?: RangeValue;
  to?: RangeValue;
}

/**
 * Serialized form of {@link @kbn/data-plugin/common.RangeKey}
 */
export interface SerializedRangeKey {
  type: typeof SerializableType.RangeKey;
  from: string | number;
  to: string | number;
  ranges: Ranges;
}

function findCustomLabel(from: RangeValue, to: RangeValue, ranges?: Ranges) {
  return (ranges || []).find(
    (range) =>
      ((from == null && range.from == null) || range.from === from) &&
      ((to == null && range.to == null) || range.to === to)
  )?.label;
}

const getRangeValue = (bucket: unknown, key: string): RangeValue => {
  const value = bucket && typeof bucket === 'object' && key in bucket && (bucket as any)[key];
  return value == null || ['string', 'number'].includes(typeof value) ? value : null;
};

const getRangeFromBucket = (bucket: unknown): BucketLike => {
  return {
    from: getRangeValue(bucket, 'from'),
    to: getRangeValue(bucket, 'to'),
  };
};

export class RangeKey extends SerializableField<SerializedRangeKey> {
  static isInstance(field: unknown): field is RangeKey {
    return field instanceof RangeKey;
  }

  static deserialize(value: SerializedRangeKey): RangeKey {
    const { to, from, ranges } = value;
    return new RangeKey({ to, from }, ranges);
  }

  static idBucket(bucket: unknown): string {
    const { from, to } = getRangeFromBucket(bucket);
    return `from:${from},to:${to}`;
  }

  gte: string | number;
  lt: string | number;
  label?: string;

  constructor(bucket: unknown, allRanges?: Ranges) {
    super();
    const { from, to } = getRangeFromBucket(bucket);
    this.gte = from == null ? -Infinity : from;
    this.lt = to == null ? +Infinity : to;
    this.label = findCustomLabel(from, to, allRanges);
  }

  toString(): string {
    return `from:${this.gte},to:${this.lt}`;
  }

  serialize(): SerializedRangeKey {
    return {
      type: SerializableType.RangeKey,
      from: this.gte,
      to: this.lt,
      ranges: [
        {
          from: this.gte,
          to: this.lt,
          label: this.label,
        },
      ],
    };
  }
}
