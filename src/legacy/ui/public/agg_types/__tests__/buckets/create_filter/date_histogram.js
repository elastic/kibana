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
import aggResp from 'fixtures/agg_resp/date_histogram';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { VisProvider } from '../../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { createFilterDateHistogram } from '../../../buckets/create_filter/date_histogram';
import { intervalOptions } from '../../../buckets/_interval_options';

describe('AggConfig Filters', function () {
  describe('date_histogram', function () {
    let vis;
    let agg;
    let field;
    let filter;
    let bucketKey;
    let bucketStart;

    let init;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      const Vis = Private(VisProvider);
      const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

      init = function (interval, duration) {
        interval = interval || 'auto';
        if (interval === 'custom') interval = agg.params.customInterval;
        duration = duration || moment.duration(15, 'minutes');
        field = _.sample(_.reject(indexPattern.fields.byType.date, 'scripted'));
        vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'date_histogram',
              schema: 'segment',
              params: { field: field.name, interval: interval, customInterval: '5d' }
            }
          ]
        });

        agg = vis.aggs[0];
        bucketKey = _.sample(aggResp.aggregations['1'].buckets).key;
        bucketStart = moment(bucketKey);

        const timePad = moment.duration(duration / 2);
        agg.buckets.setBounds({
          min: bucketStart.clone().subtract(timePad),
          max: bucketStart.clone().add(timePad),
        });
        agg.buckets.setInterval(interval);

        filter = createFilterDateHistogram(agg, bucketKey);
      };
    }));

    it('creates a valid range filter', function () {
      init();

      expect(filter).to.have.property('range');
      expect(filter.range).to.have.property(field.name);

      const fieldParams = filter.range[field.name];
      expect(fieldParams).to.have.property('gte');
      expect(fieldParams.gte).to.be.a('string');

      expect(fieldParams).to.have.property('lt');
      expect(fieldParams.lt).to.be.a('string');

      expect(fieldParams).to.have.property('format');
      expect(fieldParams.format).to.be('strict_date_optional_time');

      expect(fieldParams.gte).to.be.lessThan(fieldParams.lt);

      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', vis.indexPattern.id);
    });


    it('extends the filter edge to 1ms before the next bucket for all interval options', function () {
      intervalOptions.forEach(function (option) {
        let duration;
        if (option.val !== 'custom' && moment(1, option.val).isValid()) {
          duration = moment.duration(10, option.val);

          if (+duration < 10) {
            throw new Error('unable to create interval for ' + option.val);
          }
        }

        init(option.val, duration);

        const interval = agg.buckets.getInterval();
        const params = filter.range[field.name];

        expect(params.gte).to.be(bucketStart.toISOString());
        expect(params.lt).to.be(bucketStart.clone().add(interval).toISOString());
      });
    });
  });
});
