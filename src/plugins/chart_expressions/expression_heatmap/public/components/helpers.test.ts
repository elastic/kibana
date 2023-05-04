/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import {
  applyPaletteParams,
  getDataMinMax,
  remapStopsByNewInterval,
  getSortPredicate,
} from './helpers';

describe('applyPaletteParams', () => {
  const paletteRegistry = chartPluginMock.createPaletteRegistry();
  it('should return a palette stops array only by the name', () => {
    expect(
      applyPaletteParams(
        paletteRegistry,
        { name: 'default', type: 'palette', params: { name: 'default' } },
        { min: 0, max: 100 }
      )
    ).toEqual([
      // stops are 0 and 50 by with a 20 offset (100 divided by 5 steps) for display
      // the mock palette service has only 2 colors so tests are a bit off by that
      { color: 'red', stop: 20 },
      { color: 'black', stop: 70 },
    ]);
  });

  it('should return a palette stops array reversed', () => {
    expect(
      applyPaletteParams(
        paletteRegistry,
        { name: 'default', type: 'palette', params: { name: 'default', reverse: true } },
        { min: 0, max: 100 }
      )
    ).toEqual([
      { color: 'black', stop: 20 },
      { color: 'red', stop: 70 },
    ]);
  });

  it('should pick the default palette from the activePalette object when passed', () => {
    expect(
      applyPaletteParams(paletteRegistry, { name: 'mocked', type: 'palette' }, { min: 0, max: 100 })
    ).toEqual([
      { color: 'blue', stop: 20 },
      { color: 'yellow', stop: 70 },
    ]);
  });
});

describe('remapStopsByNewInterval', () => {
  it('should correctly remap the current palette from 0..1 to 0...100', () => {
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 0.5 },
          { color: 'red', stop: 0.9 },
        ],
        { newInterval: 100, oldInterval: 1, newMin: 0, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 90 },
    ]);

    // now test the other way around
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 50 },
          { color: 'red', stop: 90 },
        ],
        { newInterval: 1, oldInterval: 100, newMin: 0, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 0.5 },
      { color: 'red', stop: 0.9 },
    ]);
  });

  it('should correctly handle negative numbers to/from', () => {
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: -100 },
          { color: 'green', stop: -50 },
          { color: 'red', stop: -1 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: 0, oldMin: -100 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 99 },
    ]);

    // now map the other way around
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 50 },
          { color: 'red', stop: 99 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: -100, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: -100 },
      { color: 'green', stop: -50 },
      { color: 'red', stop: -1 },
    ]);

    // and test also palettes that also contains negative values
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: -50 },
          { color: 'green', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: 0, oldMin: -50 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 100 },
    ]);
  });
});

describe('getDataMinMax', () => {
  it('should pick the correct min/max based on the current range type', () => {
    expect(getDataMinMax('percent', { min: -100, max: 0 })).toEqual({ min: 0, max: 100 });
  });

  it('should pick the correct min/max apply percent by default', () => {
    expect(getDataMinMax(undefined, { min: -100, max: 0 })).toEqual({ min: 0, max: 100 });
  });
});

describe('getSortPredicate', () => {
  it('should return dataIndex if otherbucker it enabled', () => {
    const column = {
      id: '0c4cfb78-3c2f-4eaf-82b3-4b2c1c6abe5a',
      name: 'Top values of Carrier',
      meta: {
        type: 'string',
        source: 'esaggs',
        sourceParams: {
          params: {
            field: 'Carrier',
            orderBy: '1',
            order: 'desc',
            size: 3,
            otherBucket: true,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: '(missing value)',
          },
          schema: 'segment',
        },
      },
    } as DatatableColumn;
    expect(getSortPredicate(column)).toEqual('dataIndex');
  });

  it('should return numDesc for descending metric sorting', () => {
    const column = {
      id: 'col-0-2',
      name: 'Dest: Descending',
      meta: {
        type: 'string',
        source: 'esaggs',
        sourceParams: {
          params: {
            field: 'Dest',
            orderBy: '1',
            order: 'desc',
            size: 5,
            otherBucket: false,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: 'Missing',
          },
          schema: 'segment',
        },
      },
    } as DatatableColumn;
    expect(getSortPredicate(column)).toEqual('numDesc');
  });

  it('should return alphaAsc for ascending alphabetical sorting', () => {
    const column = {
      id: 'col-0-2',
      name: 'Dest: Ascending',
      meta: {
        type: 'string',
        source: 'esaggs',
        sourceParams: {
          params: {
            field: 'Dest',
            orderBy: '_key',
            order: 'asc',
            size: 5,
            otherBucket: false,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: 'Missing',
          },
          schema: 'segment',
        },
      },
    } as DatatableColumn;
    expect(getSortPredicate(column)).toEqual('alphaAsc');
  });
});
