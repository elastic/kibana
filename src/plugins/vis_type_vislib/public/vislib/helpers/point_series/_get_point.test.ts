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

import { IFieldFormatsRegistry } from '../../../../../data/common';
import { getPoint } from './_get_point';
import { setFormatService } from '../../../services';
import { Aspect } from './point_series';
import { Table, Row, Column } from '../../types';

describe('getPoint', function () {
  let deserialize: IFieldFormatsRegistry['deserialize'];

  beforeAll(() => {
    deserialize = jest.fn(() => ({
      convert: jest.fn((v) => v),
    })) as any;

    setFormatService({
      deserialize,
    } as any);
  });

  const table = {
    columns: [{ id: '0' }, { id: '1' }, { id: '3' }] as Column[],
    rows: [
      { '0': 1, '1': 2, '2': 3 },
      { '0': 4, '1': 'NaN', '2': 6 },
    ],
  } as Table;

  describe('Without series aspect', function () {
    let seriesAspect: undefined;
    let xAspect: Aspect;
    let yAspect: Aspect;

    beforeEach(function () {
      xAspect = { accessor: '0' } as Aspect;
      yAspect = { accessor: '1', title: 'Y' } as Aspect;
    });

    it('properly unwraps values', function () {
      const row = table.rows[0];
      const zAspect = { accessor: '2' } as Aspect;
      const point = getPoint(table, xAspect, seriesAspect, row, 0, yAspect, zAspect);

      expect(point).toHaveProperty('x', 1);
      expect(point).toHaveProperty('y', 2);
      expect(point).toHaveProperty('z', 3);
      expect(point).toHaveProperty('series', yAspect.title);
    });

    it('ignores points with a y value of NaN', function () {
      const row = table.rows[1];
      const point = getPoint(table, xAspect, seriesAspect, row, 1, yAspect);
      expect(point).toBe(void 0);
    });
  });

  describe('With series aspect', function () {
    let row: Row;
    let xAspect: Aspect;
    let yAspect: Aspect;

    beforeEach(function () {
      row = table.rows[0];
      xAspect = { accessor: '0' } as Aspect;
      yAspect = { accessor: '2' } as Aspect;
    });

    it('properly unwraps values', function () {
      const seriesAspect = [{ accessor: '1' } as Aspect];
      const point = getPoint(table, xAspect, seriesAspect, row, 0, yAspect);

      expect(point).toHaveProperty('x', 1);
      expect(point).toHaveProperty('series', '2');
      expect(point).toHaveProperty('y', 3);
    });

    it('should call deserialize', function () {
      const seriesAspect = [
        { accessor: '1', format: { id: 'number', params: { pattern: '$' } } } as Aspect,
      ];
      getPoint(table, xAspect, seriesAspect, row, 0, yAspect);

      expect(deserialize).toHaveBeenCalledWith(seriesAspect[0].format);
    });
  });
});
