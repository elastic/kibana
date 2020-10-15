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
import { PointSeries } from './_point_series';

describe('Point Series', () => {
  describe('getGroupedNum', () => {
    let handler;

    beforeEach(() => {
      handler = {
        visConfig: {
          get: jest.fn(),
        },
        pointSeries: {
          chartConfig: {
            series: [],
          },
          handler: {
            valueAxes: [{ id: 'stackedId' }],
          },
        },
      };
    });

    describe('normal mode', () => {
      let pointSeries;

      beforeEach(() => {
        handler.pointSeries.chartConfig.series = [
          {
            mode: 'normal',
            data: {
              label: '1st',
              rawId: 'col-1',
            },
          },
          {
            mode: 'normal',
            data: {
              label: '2nd',
              rawId: 'col-2',
            },
          },
        ];

        pointSeries = new PointSeries(handler, [{}], {}, {});
      });

      test('should calculate correct group num', () => {
        expect(pointSeries.getGroupedNum('col-2')).toBe(1);
      });

      test('should return "0" for not found id', () => {
        expect(pointSeries.getGroupedNum('wrong-id')).toBe(0);
      });
    });

    describe('stacked mode', () => {
      let pointSeries;

      beforeEach(() => {
        handler.pointSeries.chartConfig.series = [
          {
            mode: 'normal',
            data: {
              label: '1st',
              rawId: 'col-1',
            },
          },
          {
            mode: 'stacked',
            data: {
              label: '3rd',
              rawId: 'col-2',
            },
          },
          {
            mode: 'stacked',
            data: {
              label: '2nd',
              rawId: 'col-3',
            },
          },
        ];

        pointSeries = new PointSeries(handler, [{}], {}, {});
      });

      test('should calculate correct group num', () => {
        expect(pointSeries.getGroupedNum('col-2')).toBe(1);
      });

      test('should return "0" for not found id', () => {
        expect(pointSeries.getGroupedNum('wrong-id')).toBe(0);
      });
    });
  });
});
