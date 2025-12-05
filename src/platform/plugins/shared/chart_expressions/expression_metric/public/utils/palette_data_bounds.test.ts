/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable, DatatableRow } from '@kbn/expressions-plugin/common';
import { getDataBoundsForPalette } from './palette_data_bounds';

describe('palette data bounds', () => {
  const buildTableWithRows = (rows: DatatableRow[]) => {
    const table: Datatable = {
      type: 'datatable',
      columns: Object.keys(rows).map((key) => ({
        id: key,
        name: key,
        meta: { type: 'number' },
      })),
      rows,
    };

    return table;
  };

  describe('single value scenarios', () => {
    it('creates a range with the metric value in the middle', () => {
      const accessors = {
        metric: 'first',
      };
      expect(getDataBoundsForPalette(accessors, buildTableWithRows([{ first: 100 }]))).toEqual({
        min: 0,
        max: 200,
      });
      expect(getDataBoundsForPalette(accessors, buildTableWithRows([{ first: -100 }]))).toEqual({
        min: -200,
        max: 0,
      });
    });

    it('uses maximum dimension when available', () => {
      expect(
        getDataBoundsForPalette(
          { metric: 'metric', max: 'max' },
          buildTableWithRows([{ metric: 200, max: 100 }])
        )
      ).toEqual({ min: 0, max: 100 });

      expect(
        getDataBoundsForPalette(
          { metric: 'metric', max: 'max' },
          buildTableWithRows([
            { metric: 200, max: 100 },
            { metric: 400, max: 150 },
          ]),
          1
        )
      ).toEqual({ min: 0, max: 150 });
    });
  });

  it('uses minimum and maximum metric when breakdown but no max', () => {
    expect(
      getDataBoundsForPalette(
        { metric: 'metric', breakdownBy: 'breakdown' },
        buildTableWithRows([{ metric: -100 }, { metric: 100 }, { metric: 200 }, { metric: 300 }])
      )
    ).toEqual({ min: -100, max: 300 });
  });

  it('uses minimum and maximum metric when breakdown with max', () => {
    expect(
      getDataBoundsForPalette(
        { metric: 'metric', max: 'max', breakdownBy: 'breakdown' },
        buildTableWithRows([
          { metric: -100, max: 200 },
          { metric: 100, max: 250 },
          { metric: 200, max: 300 },
          { metric: 300, max: 400 },
        ])
      )
      // Return the range 0-Maximum max as rowNumber is not provided
    ).toEqual({ min: 0, max: 400 });
  });

  it('uses minimum and maximum metric when breakdown with max with rowNumber', () => {
    expect(
      getDataBoundsForPalette(
        { metric: 'metric', max: 'max', breakdownBy: 'breakdown' },
        buildTableWithRows([
          { metric: -100, max: 200 },
          { metric: 100, max: 250 },
          { metric: 200, max: 300 }, // <= it should use this
          { metric: 300, max: 400 },
        ]),
        2
      )
    ).toEqual({ min: 0, max: 300 });
  });

  it('uses minimum and maximum metric when breakdown with max with rowNumber set to 0 (edge case)', () => {
    expect(
      getDataBoundsForPalette(
        { metric: 'metric', max: 'max', breakdownBy: 'breakdown' },
        buildTableWithRows([
          { metric: -100, max: 200 }, // <= it should use this
          { metric: 100, max: 250 },
          { metric: 200, max: 300 },
          { metric: 300, max: 400 },
        ]),
        0
      )
    ).toEqual({ min: 0, max: 200 });
  });
});
