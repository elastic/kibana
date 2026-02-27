/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateAuto } from './calculate_auto';
import moment, { isDuration } from 'moment';

describe('calculateAuto.near(bucket, duration)', () => {
  it('should calculate the bucket size for 15 minutes', () => {
    const bucketSizeDuration = calculateAuto.near(100, moment.duration(15, 'minutes'));
    expect(bucketSizeDuration).not.toBeUndefined();
    expect(isDuration(bucketSizeDuration)).toBeTruthy();
    expect(bucketSizeDuration!.asSeconds()).toBe(10);
  });
  it('should calculate the bucket size for an hour', () => {
    const bucketSizeDuration = calculateAuto.near(100, moment.duration(1, 'hour'));
    expect(bucketSizeDuration).not.toBeUndefined();
    expect(isDuration(bucketSizeDuration)).toBeTruthy();
    expect(bucketSizeDuration!.asSeconds()).toBe(30);
  });
  it('should calculate the bucket size for a day', () => {
    const bucketSizeDuration = calculateAuto.near(100, moment.duration(1, 'day'));
    expect(bucketSizeDuration).not.toBeUndefined();
    expect(isDuration(bucketSizeDuration)).toBeTruthy();
    expect(bucketSizeDuration!.asMinutes()).toBe(10);
  });
});
