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

import expect from '@kbn/expect';
import { addToSiri } from '../_add_to_siri';

describe('addToSiri', function() {
  it('creates a new series the first time it sees an id', function() {
    const series = new Map();
    const point = {};
    const id = 'id';
    addToSiri(series, point, id, id, { id: id });

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(id);
    expect(series.get(id).values).to.have.length(1);
    expect(series.get(id).values[0]).to.be(point);
  });

  it('adds points to existing series if id has been seen', function() {
    const series = new Map();
    const id = 'id';

    const point = {};
    addToSiri(series, point, id, id, { id: id });

    const point2 = {};
    addToSiri(series, point2, id, id, { id: id });

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(id);
    expect(series.get(id).values).to.have.length(2);
    expect(series.get(id).values[0]).to.be(point);
    expect(series.get(id).values[1]).to.be(point2);
  });

  it('allows overriding the series label', function() {
    const series = new Map();
    const id = 'id';
    const label = 'label';
    const point = {};
    addToSiri(series, point, id, label, { id: id });

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(label);
    expect(series.get(id).values).to.have.length(1);
    expect(series.get(id).values[0]).to.be(point);
  });

  it('correctly sets id and rawId', function() {
    const series = new Map();
    const id = 'id-id2';

    const point = {};
    addToSiri(series, point, id);

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(id);
    expect(series.get(id).rawId).to.be(id);
    expect(series.get(id).id).to.be('id2');
  });
});
