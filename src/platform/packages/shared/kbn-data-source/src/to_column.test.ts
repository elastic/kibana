/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { columnToFieldBase } from './to_column';

describe('columnToFieldBase', () => {
  it('maps a column to a field', () => {
    expect(
      columnToFieldBase({
        name: 'bytes',
        type: KBN_FIELD_TYPES.NUMBER,
        esType: 'long',
        source: 'index',
      })
    ).toEqual({ name: 'bytes', type: 'number', esTypes: ['long'] });
  });

  it('maps an ES|QL counter type to its base type and a counter time series metric', () => {
    expect(
      columnToFieldBase({
        name: 'requests',
        type: KBN_FIELD_TYPES.NUMBER,
        esType: 'counter_long',
        source: 'index',
      })
    ).toEqual({ name: 'requests', type: 'number', esTypes: ['long'], timeSeriesMetric: 'counter' });
  });

  it('leaves esTypes undefined without an ES type', () => {
    expect(
      columnToFieldBase({ name: 'total', type: KBN_FIELD_TYPES.NUMBER, source: 'esql-result' })
    ).toEqual({ name: 'total', type: 'number', esTypes: undefined });
  });
});
