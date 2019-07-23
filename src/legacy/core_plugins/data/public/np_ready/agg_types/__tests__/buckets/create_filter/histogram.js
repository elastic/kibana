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
import ngMock from 'ng_mock';
import { VisProvider } from '../../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { createFilterHistogram } from '../../../buckets/create_filter/histogram';

describe('AggConfig Filters', function () {
  describe('histogram', function () {
    let indexPattern;
    let Vis;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    }));

    it('should return an range filter for histogram', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'histogram',
            schema: 'segment',
            params: { field: 'bytes', interval: 1024 }
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.histogram[0];
      const filter = createFilterHistogram(aggConfig, 2048);
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter).to.have.property('range');
      expect(filter.range).to.have.property('bytes');
      expect(filter.range.bytes).to.have.property('gte', 2048);
      expect(filter.range.bytes).to.have.property('lt', 3072);
      expect(filter.meta).to.have.property('formattedValue', '2,048');
    });
  });
});
