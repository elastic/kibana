/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { isHistogramMetric, isLegacyHistogram } from './histogram_metric';

describe('isHistogramMetric', () => {
  it('returns true for histogram instruments on histogram field types', () => {
    expect(isHistogramMetric(ES_FIELD_TYPES.HISTOGRAM, 'histogram')).toBe(true);
    expect(isHistogramMetric(ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM, 'histogram')).toBe(true);
    expect(isHistogramMetric(ES_FIELD_TYPES.TDIGEST, 'histogram')).toBe(true);
  });

  it('returns false when the instrument is not histogram', () => {
    expect(isHistogramMetric(ES_FIELD_TYPES.HISTOGRAM, 'gauge')).toBe(false);
    expect(isHistogramMetric(ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM, 'counter')).toBe(false);
  });

  it('returns false when the field type is not a histogram', () => {
    expect(isHistogramMetric(ES_FIELD_TYPES.DOUBLE, 'histogram')).toBe(false);
    expect(isHistogramMetric(ES_FIELD_TYPES.LONG, 'histogram')).toBe(false);
  });
});

describe('isLegacyHistogram', () => {
  it('returns true when type and instrument are both histogram', () => {
    expect(isLegacyHistogram(ES_FIELD_TYPES.HISTOGRAM, 'histogram')).toBe(true);
  });

  it('returns false when type is histogram but instrument is not', () => {
    expect(isLegacyHistogram(ES_FIELD_TYPES.HISTOGRAM, 'gauge')).toBe(false);
    expect(isLegacyHistogram(ES_FIELD_TYPES.HISTOGRAM, 'counter')).toBe(false);
  });

  it('returns false when type is not histogram', () => {
    expect(isLegacyHistogram(ES_FIELD_TYPES.LONG, 'histogram')).toBe(false);
    expect(isLegacyHistogram(ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM, 'histogram')).toBe(false);
  });
});
