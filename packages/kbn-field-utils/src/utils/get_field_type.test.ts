/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { getFieldType } from './get_field_type';

describe('FieldUtils getFieldType()', () => {
  it('uses time series metric if set', () => {
    expect(
      getFieldType({
        type: 'string',
        timeSeriesMetric: 'histogram',
      } as DataViewField)
    ).toBe('histogram');
  });

  it('returns field type otherwise', () => {
    expect(
      getFieldType({
        type: 'number',
      } as DataViewField)
    ).toBe('number');
  });
});
