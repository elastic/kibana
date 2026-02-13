/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { isLegacyHistogram } from './legacy_histogram';

describe('isLegacyHistogram', () => {
  it('returns true when type and instrument are both histogram', () => {
    expect(isLegacyHistogram({ type: ES_FIELD_TYPES.HISTOGRAM, instrument: 'histogram' })).toBe(
      true
    );
  });

  it('returns false when type is histogram but instrument is not', () => {
    expect(isLegacyHistogram({ type: ES_FIELD_TYPES.HISTOGRAM, instrument: 'gauge' })).toBe(false);
    expect(isLegacyHistogram({ type: ES_FIELD_TYPES.HISTOGRAM, instrument: 'counter' })).toBe(
      false
    );
  });

  it('returns false when type is histogram and instrument is undefined', () => {
    expect(isLegacyHistogram({ type: ES_FIELD_TYPES.HISTOGRAM, instrument: undefined })).toBe(
      false
    );
  });

  it('returns false when type is not histogram', () => {
    expect(isLegacyHistogram({ type: ES_FIELD_TYPES.LONG, instrument: 'histogram' })).toBe(false);
    expect(
      isLegacyHistogram({ type: ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM, instrument: 'histogram' })
    ).toBe(false);
  });
});
