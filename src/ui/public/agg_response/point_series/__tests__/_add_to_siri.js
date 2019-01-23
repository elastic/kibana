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

import expect from 'expect.js';
import { addToSiri } from '../_add_to_siri';

describe('addToSiri', function () {
  const xKeys = ['', 'foo', 'bar', 'baz'];

  it('creates a new series the first time it sees an id', function () {
    const series = new Map();
    const point = { x: 'foo' };
    const id = 'id';
    addToSiri(xKeys, series, point, id, id, { id: id });

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(id);
  });

  it('instantiates a zero-filled array with ordered x values the first time it sees an id', function () {
    const series = new Map();
    const point = { x: 'foo' };
    const id = 'id';
    const expected = {
      x: '',
      xi: Infinity,
      y: 0,
      series: id,
    };
    addToSiri(xKeys, series, point, id, id, { id: id });

    expect(series.get(id).values).to.have.length(4);
    expect(series.get(id).values[0]).to.eql(expected);
  });

  it('writes the correct value to the zero-filled array the first time it sees an id', function () {
    const series = new Map();
    const point = { x: 'foo' };
    const id = 'id';
    const zeroFilled = {
      x: '',
      xi: Infinity,
      y: 0,
      series: id,
    };
    addToSiri(xKeys, series, point, id, id, { id: id });

    expect(series.get(id).values).to.have.length(4);
    expect(series.get(id).values[0]).to.eql(zeroFilled);
    expect(series.get(id).values[1]).to.be(point);
  });

  it('updates points in existing series if it has been seen', function () {
    const series = new Map();
    const id = 'id';

    const point0 = { x: '' };
    addToSiri(xKeys, series, point0, id, id, { id: id });

    const point1 = { x: 'foo' };
    addToSiri(xKeys, series, point1, id, id, { id: id });

    const point2 = { x: 'bar' };
    addToSiri(xKeys, series, point2, id, id, { id: id });

    const point3 = { x: 'baz' };
    addToSiri(xKeys, series, point3, id, id, { id: id });

    expect(series.get(id).label).to.be(id);
    expect(series.get(id).values[0]).to.be(point0);
    expect(series.get(id).values[1]).to.be(point1);
    expect(series.get(id).values[2]).to.be(point2);
    expect(series.get(id).values[3]).to.be(point3);
  });

  it('allows overriding the series label', function () {
    const series = new Map();
    const id = 'id';
    const label = 'label';
    const point = { x: 'foo' };
    addToSiri(xKeys, series, point, id, label, { id: id });

    expect(series.get(id).label).to.be(label);
  });
});
