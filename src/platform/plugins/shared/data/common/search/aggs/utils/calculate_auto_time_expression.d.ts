/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeBucketsInterval } from '../buckets/lib/time_buckets/time_buckets';
import type { TimeRange } from '../../../query';
export declare function getCalculateAutoTimeExpression(getConfig: (key: string) => any): {
  (range: TimeRange): string | undefined;
  (range: TimeRange, interval: string, asExpression?: true): string | undefined;
  (range: TimeRange, interval: string, asExpression: false): TimeBucketsInterval | undefined;
  (range: TimeRange, interval?: string, asExpression?: boolean):
    | string
    | TimeBucketsInterval
    | undefined;
};
