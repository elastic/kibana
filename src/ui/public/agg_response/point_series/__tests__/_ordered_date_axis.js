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

import moment from 'moment';
import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { PointSeriesOrderedDateAxisProvider } from '../_ordered_date_axis';

describe('orderedDateAxis', function () {

  const baseArgs = {
    vis: {
      indexPattern: {
        timeFieldName: '@timestamp'
      }
    },
    chart: {
      aspects: {
        x: {
          aggConfig: {
            fieldIsTimeField: _.constant(true),
            buckets: {
              getScaledDateFormat: _.constant('hh:mm:ss'),
              getInterval: _.constant(moment.duration(15, 'm')),
              getBounds: _.constant({ min: moment().subtract(15, 'm'), max: moment() })
            }
          }
        }
      }
    }
  };

  let orderedDateAxis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    orderedDateAxis = Private(PointSeriesOrderedDateAxisProvider);
  }));

  describe('xAxisFormatter', function () {
    it('sets the xAxisFormatter', function () {
      const args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.vis, args.chart);

      expect(args.chart).to.have.property('xAxisFormatter');
      expect(args.chart.xAxisFormatter).to.be.a('function');
    });

    it('formats values using moment, and returns strings', function () {
      const args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.vis, args.chart);

      const val = '2014-08-06T12:34:01';
      expect(args.chart.xAxisFormatter(val))
        .to.be(moment(val).format('hh:mm:ss'));
    });
  });

  describe('ordered object', function () {
    it('sets date: true', function () {
      const args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.vis, args.chart);

      expect(args.chart)
        .to.have.property('ordered');

      expect(args.chart.ordered)
        .to.have.property('date', true);
    });

    it('relies on agg.buckets for the interval', function () {
      const args = _.cloneDeep(baseArgs);
      const spy = sinon.spy(args.chart.aspects.x.aggConfig.buckets, 'getInterval');
      orderedDateAxis(args.vis, args.chart);
      expect(spy).to.have.property('callCount', 1);
    });

    it('sets the min/max when the buckets are bounded', function () {
      const args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.vis, args.chart);
      expect(moment.isMoment(args.chart.ordered.min)).to.be(true);
      expect(moment.isMoment(args.chart.ordered.max)).to.be(true);
    });

    it('does not set the min/max when the buckets are unbounded', function () {
      const args = _.cloneDeep(baseArgs);
      args.chart.aspects.x.aggConfig.buckets.getBounds = _.constant();
      orderedDateAxis(args.vis, args.chart);
      expect(args.chart.ordered).to.not.have.property('min');
      expect(args.chart.ordered).to.not.have.property('max');
    });
  });
});
