/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { addToSiri, Serie } from './_add_to_siri';
import { Point } from './_get_point';
import { Dimension } from './point_series';

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
