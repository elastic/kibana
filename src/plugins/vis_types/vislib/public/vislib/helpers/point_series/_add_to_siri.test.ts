/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Dimension } from '@kbn/vis-type-xy-plugin/public';

import { addToSiri, Serie } from './_add_to_siri';
import { Point } from './_get_point';

describe('addToSiri', function () {
  it('creates a new series the first time it sees an id', function () {
    const series = new Map<string, Serie>();
    const point = {} as Point;
    const id = 'id';
    addToSiri(series, point, id, id, { id });

    const expectedSerie = series.get(id) as Serie;
    expect(series.has(id)).toBe(true);
    expect(expectedSerie).toEqual(expect.any(Object));
    expect(expectedSerie.label).toBe(id);
    expect(expectedSerie.values).toHaveLength(1);
    expect(expectedSerie.values[0]).toBe(point);
  });

  it('adds points to existing series if id has been seen', function () {
    const series = new Map();
    const id = 'id';

    const point = {} as Point;
    addToSiri(series, point, id, id, { id });

    const point2 = {} as Point;
    addToSiri(series, point2, id, id, { id });

    expect(series.has(id)).toBe(true);
    expect(series.get(id)).toEqual(expect.any(Object));
    expect(series.get(id).label).toBe(id);
    expect(series.get(id).values).toHaveLength(2);
    expect(series.get(id).values[0]).toBe(point);
    expect(series.get(id).values[1]).toBe(point2);
  });

  it('allows overriding the series label', function () {
    const series = new Map();
    const id = 'id';
    const label = 'label';
    const point = {} as Point;
    addToSiri(series, point, id, label, { id });

    expect(series.has(id)).toBe(true);
    expect(series.get(id)).toEqual(expect.any(Object));
    expect(series.get(id).label).toBe(label);
    expect(series.get(id).values).toHaveLength(1);
    expect(series.get(id).values[0]).toBe(point);
  });

  it('correctly sets id and rawId', function () {
    const series = new Map();
    const id = 'id-id2';

    const point = {} as Point;
    addToSiri(series, point, id, undefined, {} as Dimension['format']);

    expect(series.has(id)).toBe(true);
    expect(series.get(id)).toEqual(expect.any(Object));
    expect(series.get(id).label).toBe(id);
    expect(series.get(id).rawId).toBe(id);
    expect(series.get(id).id).toBe('id2');
  });
});
