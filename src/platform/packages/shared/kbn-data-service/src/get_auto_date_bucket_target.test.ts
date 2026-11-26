/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_HISTOGRAM_BAR_TARGET, UI_SETTINGS } from './constants';
import { getAutoDateBucketTarget } from './get_auto_date_bucket_target';
import type { GetConfigFn } from './types';

const config =
  (values: Record<string, unknown>): GetConfigFn =>
  (key, defaultOverride) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key] as never;
    }
    return defaultOverride as never;
  };

describe('getAutoDateBucketTarget', () => {
  it('returns histogram:barTarget when it is a positive integer', () => {
    expect(getAutoDateBucketTarget(config({ [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: 75 }))).toBe(75);
  });

  it('defaults to DEFAULT_HISTOGRAM_BAR_TARGET when the setting is missing', () => {
    expect(getAutoDateBucketTarget(config({}))).toBe(DEFAULT_HISTOGRAM_BAR_TARGET);
  });

  it('defaults to DEFAULT_HISTOGRAM_BAR_TARGET when the setting is not a positive integer', () => {
    for (const value of [0, -1, 1.5, '100', '150']) {
      expect(getAutoDateBucketTarget(config({ [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: value }))).toBe(
        DEFAULT_HISTOGRAM_BAR_TARGET
      );
    }
  });

  it('does not clamp to histogram:maxBars', () => {
    expect(
      getAutoDateBucketTarget(
        config({
          [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: 100,
          [UI_SETTINGS.HISTOGRAM_MAX_BARS]: 10,
        })
      )
    ).toBe(100);
  });
});
