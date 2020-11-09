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
