/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
