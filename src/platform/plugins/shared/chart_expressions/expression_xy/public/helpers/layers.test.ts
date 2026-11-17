/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataLayerConfig } from '../../common';
import { sampleLayer } from '../../common/test_utils';
import { toXRangeLowerBounds } from './layers';

describe('toXRangeLowerBounds', () => {
  it('should replace a range x-axis with its lower bounds', () => {
    const layer: DataLayerConfig = {
      ...sampleLayer,
      xAccessor: 'bucket',
      xScaleType: 'ordinal',
      accessors: ['count'],
      splitAccessors: [],
      table: {
        type: 'datatable',
        columns: [
          { id: 'bucket', name: 'bucket', meta: { type: 'number_range' } },
          { id: 'count', name: 'count', meta: { type: 'number' } },
        ],
        rows: [
          { bucket: '500.0..1000.0', count: 3 },
          { bucket: '0.0..500.0', count: 5 },
          { bucket: '1000.0..1500.0', count: 1 },
        ],
      },
    };

    const { table } = toXRangeLowerBounds(layer);

    expect(table.rows).toEqual([
      { bucket: 500, count: 3 },
      { bucket: 0, count: 5 },
      { bucket: 1000, count: 1 },
    ]);
    // The axis formats the lower bounds as numbers
    expect(table.columns[0].meta.params).toEqual({ id: 'number' });
  });

  it('should keep the layer as it is for other x-axis types', () => {
    expect(toXRangeLowerBounds(sampleLayer)).toBe(sampleLayer);
  });
});
