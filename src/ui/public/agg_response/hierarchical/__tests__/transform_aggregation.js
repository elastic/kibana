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
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { HierarchicalTransformAggregationProvider } from '../_transform_aggregation';

describe('buildHierarchicalData()', function () {
  describe('transformAggregation()', function () {
    let transform;
    let fixture;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      transform = Private(HierarchicalTransformAggregationProvider);
    }));

    beforeEach(function () {

      function fakeAgg(id, name) {
        return {
          id: id,
          name: name,
          schema: { group: 'buckets' },
          getKey: (bucket) => bucket.key,
          fieldFormatter: _.constant(String)
        };
      }

      fixture = {};
      fixture.agg = fakeAgg('agg_2', 'test');
      fixture.agg._next = fakeAgg('agg_3', 'example');

      fixture.metric = fakeAgg('agg_1', 'metric');
      fixture.metric.getValue = function (b) { return _.has(b, this.id) ? b[this.id] : b.doc_count; };

      fixture.aggData = {
        buckets: [
          { key: 'foo', doc_count: 2, agg_3: { buckets: [ { key: 'win', doc_count: 1 }, { key: 'mac', doc_count: 1 }] } },
          { key: 'bar', doc_count: 4, agg_3: {  buckets: [ { key: 'win', doc_count: 2 }, { key: 'mac', doc_count: 2 }] } }
        ]
      };

    });

    it('relies on metricAgg#getValue() for the size of the children', function () {
      const aggData = {
        buckets: [
          { key: 'foo' },
          { key: 'bar' }
        ]
      };

      const football = {};
      fixture.metric.getValue = _.constant(football);

      const children = transform(fixture.agg, fixture.metric, aggData);
      expect(children).to.be.an(Array);
      expect(children).to.have.length(2);
      expect(children[0]).to.have.property('size', football);
      expect(children[1]).to.have.property('size', football);
    });

    it('should create two levels of metrics', function () {
      const children = transform(fixture.agg, fixture.metric, fixture.aggData);
      fixture.metric.getValue = function (b) { return b.doc_count; };

      expect(children).to.be.an(Array);
      expect(children).to.have.length(2);
      expect(children[0]).to.have.property('children');
      expect(children[1]).to.have.property('children');
      expect(children[0]).to.have.property('aggConfig', fixture.agg);
      expect(children[1]).to.have.property('aggConfig', fixture.agg);
      expect(children[0].children).to.have.length(2);
      expect(children[1].children).to.have.length(2);
      expect(children[0]).to.have.property('name', 'foo');
      expect(children[0]).to.have.property('size', 2);
      expect(children[1]).to.have.property('name', 'bar');
      expect(children[1]).to.have.property('size', 4);
      expect(children[0].children[0]).to.have.property('size', 1);
      expect(children[0].children[0]).to.have.property('aggConfig', fixture.agg.agg_3);
      expect(children[0].children[0]).to.have.property('name', 'win');
      expect(children[0].children[1]).to.have.property('size', 1);
      expect(children[0].children[1]).to.have.property('parent', children[0]);
      expect(children[0].children[1]).to.have.property('aggConfig', fixture.agg.agg_3);
      expect(children[0].children[1]).to.have.property('name', 'mac');
      expect(children[1].children[0]).to.have.property('size', 2);
      expect(children[0].children[1]).to.have.property('parent', children[0]);
      expect(children[1].children[0]).to.have.property('aggConfig', fixture.agg.agg_3);
      expect(children[1].children[0]).to.have.property('name', 'win');
      expect(children[1].children[1]).to.have.property('size', 2);
      expect(children[1].children[1]).to.have.property('parent', children[1]);
      expect(children[1].children[1]).to.have.property('aggConfig', fixture.agg.agg_3);
      expect(children[1].children[1]).to.have.property('name', 'mac');
      expect(children[1].children[1]).to.have.property('parent', children[1]);
    });

  });
});
