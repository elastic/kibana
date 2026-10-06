/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type moment from 'moment';
export declare const boundsDescendingRaw: (
  | {
      bound: number;
      interval: moment.Duration;
      boundLabel: string;
      intervalLabel: string;
    }
  | {
      bound: moment.Duration;
      interval: moment.Duration;
      boundLabel: string;
      intervalLabel: string;
    }
)[];
/**
 * Using some simple rules we pick a "pretty" interval that will
 * produce around the number of buckets desired given a time range.
 *
 * @param targetBucketCount desired number of buckets
 * @param duration time range the agg covers
 */
export declare function calcAutoIntervalNear(
  targetBucketCount: number,
  duration: number
): moment.Duration;
/**
 * Pick a "pretty" interval that produces no more than the maxBucketCount
 * for the given time range.
 *
 * @param maxBucketCount maximum number of buckets to create
 * @param duration amount of time covered by the agg
 */
export declare function calcAutoIntervalLessThan(
  maxBucketCount: number,
  duration: number
): moment.Duration;
