/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Dimension, Dimensions } from '@kbn/vis-type-xy-plugin/public';

import { getAspects } from './_get_aspects';
import { Aspect } from './point_series';
import { Table, Row } from '../../types';

describe('getAspects', function () {
  let table: Table;
  let dimensions: Dimensions;

  function validate(aspect: Aspect, i: string) {
    expect(aspect).toEqual(expect.any(Object));
    expect(aspect).toHaveProperty('accessor', i);
  }

  function init(group: number, x: number | null, y: number) {
    table = {
      columns: [
        { id: '0', name: 'date' }, // date
        { id: '1', name: 'date utc_time' }, // date
        { id: '2', name: 'ext' }, // extension
        { id: '3', name: 'geo.src' }, // extension
        { id: '4', name: 'count' }, // count
        { id: '5', name: 'avg bytes' }, // avg
      ],
      rows: [] as Row[],
    } as Table;

    dimensions = {
      x: { accessor: x } as Dimension,
      y: [{ accessor: y } as Dimension],
      series: [{ accessor: group } as Dimension],
    } as Dimensions;
  }

  it('produces an aspect object for each of the aspect types found in the columns', function () {
    init(1, 0, 2);

    const aspects = getAspects(table, dimensions);
    validate(aspects.x[0], '0');
    validate(aspects.series![0], '1');
    validate(aspects.y![0], '2');
  });

  it('creates a fake x aspect if the column does not exist', function () {
    init(0, null, 1);

    const aspects = getAspects(table, dimensions);

    expect(aspects.x[0]).toEqual(expect.any(Object));
    expect(aspects.x[0]).toHaveProperty('accessor', -1);
    expect(aspects.x[0]).toHaveProperty('title');
  });
});
