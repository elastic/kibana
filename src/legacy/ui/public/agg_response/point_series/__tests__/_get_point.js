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
import { getPoint } from '../_get_point';

describe('getPoint', function() {
  const table = {
    columns: [{ id: '0' }, { id: '1' }, { id: '3' }],
    rows: [
      { '0': 1, '1': 2, '2': 3 },
      { '0': 4, '1': 'NaN', '2': 6 },
    ],
  };

  describe('Without series aspect', function() {
    let seriesAspect;
    let xAspect;
    let yAspect;
    let yScale;

    beforeEach(function() {
      seriesAspect = null;
      xAspect = { accessor: 0 };
      yAspect = { accessor: 1, title: 'Y' };
      yScale = 5;
    });

    it('properly unwraps and scales values', function() {
      const row = table.rows[0];
      const zAspect = { accessor: 2 };
      const point = getPoint(table, xAspect, seriesAspect, yScale, row, 0, yAspect, zAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('y', 10)
        .and.have.property('z', 3)
        .and.have.property('series', yAspect.title);
    });

    it('ignores points with a y value of NaN', function() {
      const row = table.rows[1];
      const point = getPoint(table, xAspect, seriesAspect, yScale, row, 1, yAspect);
      expect(point).to.be(void 0);
    });
  });

  describe('With series aspect', function() {
    let row;
    let xAspect;
    let yAspect;
    let yScale;

    beforeEach(function() {
      row = table.rows[0];
      xAspect = { accessor: 0 };
      yAspect = { accessor: 2 };
      yScale = null;
    });

    it('properly unwraps and scales values', function() {
      const seriesAspect = [{ accessor: 1 }];
      const point = getPoint(table, xAspect, seriesAspect, yScale, row, 0, yAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', '2')
        .and.have.property('y', 3);
    });

    it('properly formats series values', function() {
      const seriesAspect = [{ accessor: 1, format: { id: 'number', params: { pattern: '$' } } }];
      const point = getPoint(table, xAspect, seriesAspect, yScale, row, 0, yAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', '$2')
        .and.have.property('y', 3);
    });
  });
});
