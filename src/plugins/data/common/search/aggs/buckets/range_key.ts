/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const id = Symbol('id');

type Ranges = Array<{
  from: string | number | undefined;
  to: string | number | undefined;
  label?: string;
}>;

export class RangeKey {
  [id]: string;
  gte: string | number;
  lt: string | number;
  label?: string;

  private static findCustomLabel(from: string | number, to: string | number, ranges: Ranges) {
    return ranges
      ? ranges.find(
          (range) =>
            ((from === -Infinity && range.from === undefined) || range.from === from) &&
            ((to === Infinity && range.to === undefined) || range.to === to)
        )?.label
      : undefined;
  }

  constructor(bucket: any, allRanges?: Ranges) {
    this.gte = bucket.from == null ? -Infinity : bucket.from;
    this.lt = bucket.to == null ? +Infinity : bucket.to;
    this.label = allRanges ? RangeKey.findCustomLabel(this.gte, this.lt, allRanges) : undefined;

    this[id] = RangeKey.idBucket(bucket);
  }

  static idBucket(bucket: any, allRanges?: Ranges) {
    const customLabel = allRanges
      ? RangeKey.findCustomLabel(bucket.from, bucket.to, allRanges)
      : undefined;
    return `from:${bucket.from},to:${bucket.to},label:${customLabel}`;
  }

  toString() {
    return this[id];
  }
}
