/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getChangedSettings } from './get_changed_settings';
import type { MetricsGridSettings } from '../../../types';

const applied: MetricsGridSettings = {
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'p95',
};

describe('getChangedSettings', () => {
  it('returns an empty object when the draft matches the applied settings', () => {
    expect(getChangedSettings(applied, applied)).toEqual({});
  });

  it('returns only the field that changed', () => {
    const draft: MetricsGridSettings = { ...applied, counterAggregation: 'max' };

    expect(getChangedSettings(draft, applied)).toEqual({ counterAggregation: 'max' });
  });

  it('returns every field that changed across all three settings', () => {
    const draft: MetricsGridSettings = {
      counterAggregation: 'sum',
      gaugeAggregation: 'min',
      histogramPercentile: 'p90',
    };

    expect(getChangedSettings(draft, applied)).toEqual({
      gaugeAggregation: 'min',
      histogramPercentile: 'p90',
    });
  });
});
