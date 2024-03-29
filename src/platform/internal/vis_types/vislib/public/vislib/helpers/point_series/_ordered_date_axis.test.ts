/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import _ from 'lodash';

import type { DateHistogramParams } from '@kbn/visualizations-plugin/public';

import { orderedDateAxis } from './_ordered_date_axis';
import { OrderedChart } from './point_series';

describe('orderedDateAxis', function () {
  const baseArgs = {
    vis: {
      indexPattern: {
        timeFieldName: '@timestamp',
      },
    },
    chart: {
      ordered: {},
      aspects: {
        x: [
          {
            params: {
              format: 'hh:mm:ss',
              bounds: {
                min: moment().subtract(15, 'm').valueOf(),
                max: moment().valueOf(),
              },
            },
          },
        ],
      },
    } as OrderedChart,
  };

  describe('ordered object', function () {
    it('sets date: true', function () {
      const args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.chart);

      expect(args.chart).toHaveProperty('ordered');

      expect(args.chart.ordered).toHaveProperty('date', true);
    });

    it('sets the min/max when the buckets are bounded', function () {
      const args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.chart);
      expect(args.chart.ordered).toHaveProperty('min');
      expect(args.chart.ordered).toHaveProperty('max');
    });

    it('does not set the min/max when the buckets are unbounded', function () {
      const args = _.cloneDeep(baseArgs);
      (args.chart.aspects.x[0].params as DateHistogramParams).bounds = undefined;
      orderedDateAxis(args.chart);
      expect(args.chart.ordered).not.toHaveProperty('min');
      expect(args.chart.ordered).not.toHaveProperty('max');
    });
  });
});
