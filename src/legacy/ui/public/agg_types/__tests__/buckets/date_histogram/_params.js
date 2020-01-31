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

import _ from 'lodash';
import moment from 'moment';
import expect from '@kbn/expect';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import AggParamWriterProvider from '../../agg_param_writer';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import chrome from '../../../../chrome';
import { aggTypes } from '../../..';
import { AggConfig } from '../../../agg_config';
import { timefilter } from 'ui/timefilter';

const config = chrome.getUiSettingsClient();

describe('date_histogram params', function() {
  let paramWriter;
  let writeInterval;
  let write;

  let getTimeBounds;
  let timeField;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(Private) {
      const AggParamWriter = Private(AggParamWriterProvider);
      const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

      timeField = indexPattern.timeFieldName;

      paramWriter = new AggParamWriter({ aggType: 'date_histogram' });
      writeInterval = function(interval, timeRange, params = {}) {
        return paramWriter.write({
          ...params,
          interval: interval,
          field: timeField,
          timeRange: timeRange,
        });
      };
      write = params => {
        return paramWriter.write({ interval: '10s', ...params });
      };

      const now = moment();
      getTimeBounds = function(n, units) {
        timefilter.enableAutoRefreshSelector();
        timefilter.enableTimeRangeSelector();
        return {
          from: now.clone().subtract(n, units),
          to: now.clone(),
        };
      };
    })
  );

  describe('interval', function() {
    it('accepts a valid calendar interval', function() {
      const output = writeInterval('d');
      expect(output.params).to.have.property('calendar_interval', '1d');
    });

    it('accepts a valid fixed interval', () => {
      const output = writeInterval('100s');
      expect(output.params).to.have.property('fixed_interval', '100s');
    });

    it('throws error when interval is invalid', function() {
      expect(() => writeInterval('foo')).to.throw('TypeError: "foo" is not a valid interval.');
    });

    it('automatically picks an interval', function() {
      const timeBounds = getTimeBounds(15, 'm');
      const output = writeInterval('auto', timeBounds);
      expect(output.params).to.have.property('fixed_interval', '30s');
    });

    it('does not scale down the interval', () => {
      const timeBounds = getTimeBounds(1, 'm');
      const output = writeInterval('h', timeBounds);
      expect(output.params).to.have.property('calendar_interval', '1h');
      expect(output).not.to.have.property('metricScaleText');
      expect(output).not.to.have.property('metricScale');
    });

    describe('scaling behavior', () => {
      it('should not scale without scaleMetricValues: true', function() {
        const timeBounds = getTimeBounds(30, 'm');
        const output = writeInterval('s', timeBounds);
        expect(output.params).to.have.property('fixed_interval', '10s');
        expect(output).not.to.have.property('metricScaleText');
        expect(output).not.to.property('metricScale');
      });

      describe('only scales when all metrics are sum or count', function() {
        const tests = [
          [false, 'avg', 'count', 'sum'],
          [true, 'count', 'sum'],
          [false, 'count', 'cardinality'],
        ];

        tests.forEach(function(test) {
          const should = test.shift();
          const typeNames = test.slice();

          it(typeNames.join(', ') + ' should ' + (should ? '' : 'not') + ' scale', function() {
            const timeBounds = getTimeBounds(1, 'y');

            const vis = paramWriter.vis;
            vis.aggs.aggs.splice(0);

            const histoConfig = new AggConfig(vis.aggs, {
              type: aggTypes.buckets.find(agg => agg.name === 'date_histogram'),
              schema: 'segment',
              params: {
                interval: 's',
                field: timeField,
                timeRange: timeBounds,
                scaleMetricValues: true,
              },
            });

            vis.aggs.aggs.push(histoConfig);

            typeNames.forEach(function(type) {
              vis.aggs.aggs.push(
                new AggConfig(vis.aggs, {
                  type: aggTypes.metrics.find(agg => agg.name === type),
                  schema: 'metric',
                })
              );
            });

            const output = histoConfig.write(vis.aggs);
            expect(_.has(output, 'metricScale')).to.be(should);
          });
        });
      });
    });
  });

  describe('time_zone', () => {
    beforeEach(() => {
      sinon.stub(config, 'get');
      sinon.stub(config, 'isDefault');
    });

    it('should use the specified time_zone', () => {
      const output = write({ time_zone: 'Europe/Kiev' });
      expect(output.params).to.have.property('time_zone', 'Europe/Kiev');
    });

    it('should use the Kibana time_zone if no parameter specified', () => {
      config.isDefault.withArgs('dateFormat:tz').returns(false);
      config.get.withArgs('dateFormat:tz').returns('Europe/Riga');
      const output = write({});
      expect(output.params).to.have.property('time_zone', 'Europe/Riga');
    });

    it('should use the fixed time_zone from the index pattern typeMeta', () => {
      _.set(
        paramWriter.indexPattern,
        ['typeMeta', 'aggs', 'date_histogram', timeField, 'time_zone'],
        'Europe/Rome'
      );
      const output = write({ field: timeField });
      expect(output.params).to.have.property('time_zone', 'Europe/Rome');
    });

    afterEach(() => {
      config.get.restore();
      config.isDefault.restore();
    });
  });

  describe('extended_bounds', function() {
    it('should write a long value if a moment passed in', function() {
      const then = moment(0);
      const now = moment(500);
      const output = write({
        extended_bounds: {
          min: then,
          max: now,
        },
      });

      expect(typeof output.params.extended_bounds.min).to.be('number');
      expect(typeof output.params.extended_bounds.max).to.be('number');
      expect(output.params.extended_bounds.min).to.be(then.valueOf());
      expect(output.params.extended_bounds.max).to.be(now.valueOf());
    });

    it('should write a long if a long is passed', function() {
      const then = 0;
      const now = 500;
      const output = write({
        extended_bounds: {
          min: then,
          max: now,
        },
      });

      expect(typeof output.params.extended_bounds.min).to.be('number');
      expect(typeof output.params.extended_bounds.max).to.be('number');
      expect(output.params.extended_bounds.min).to.be(then.valueOf());
      expect(output.params.extended_bounds.max).to.be(now.valueOf());
    });
  });
});
