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
import { getAspects } from '../_get_aspects';

describe('getAspects', function () {

  let table;
  let dimensions;

  function validate(aspect, i) {
    expect(aspect)
      .to.be.an('object')
      .and.have.property('accessor', i);
  }

  function init(group, x, y) {
    table = {
      columns: [
        { id: '0', title: 'date' }, // date
        { id: '1', title: 'date utc_time' }, // date
        { id: '2', title: 'ext' }, // extension
        { id: '3', title: 'geo.src' }, // extension
        { id: '4', title: 'count' }, // count
        { id: '5', title: 'avg bytes' }  // avg
      ],
      rows: []
    };

    dimensions = {
      x: { accessor: x },
      y: { accessor: y },
      series: { accessor: group },
    };
  }

  it('produces an aspect object for each of the aspect types found in the columns', function () {
    init(1, 0, 2);

    const aspects = getAspects(table, dimensions);
    validate(aspects.x[0], '0');
    validate(aspects.series[0], '1');
    validate(aspects.y[0], '2');
  });

  it('creates a fake x aspect if the column does not exist', function () {
    init(0, null, 1);

    const aspects = getAspects(table, dimensions);

    expect(aspects.x[0])
      .to.be.an('object')
      .and.have.property('accessor', -1)
      .and.have.property('title');

  });
});
