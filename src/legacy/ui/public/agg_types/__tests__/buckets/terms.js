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
import { aggTypes } from '../..';

describe('Terms Agg', function() {
  describe('order agg editor UI', function() {
    let $rootScope;

    function init({ metricAggs = [], aggParams = {} }) {
      ngMock.module('kibana');
      ngMock.inject(function($controller, _$rootScope_) {
        const terms = aggTypes.buckets.find(agg => agg.name === 'terms');
        const orderAggController = terms.paramByName('orderAgg').controller;

        $rootScope = _$rootScope_;
        $rootScope.agg = {
          id: 'test',
          params: aggParams,
          type: terms,
          vis: {
            aggs: [],
          },
          getParam: key => aggParams[key],
        };
        $rootScope.metricAggs = metricAggs;
        $controller(orderAggController, { $scope: $rootScope });
        $rootScope.$digest();
      });
    }

    // should be rewritten after EUIficate order_agg.html
    it.skip('selects _key if the selected metric becomes incompatible', function() {
      init({
        metricAggs: [
          {
            id: 'agg1',
            type: {
              name: 'count',
            },
          },
        ],
      });

      expect($rootScope.agg.params.orderBy).to.be('agg1');
      $rootScope.metricAggs = [
        {
          id: 'agg1',
          type: {
            name: 'top_hits',
          },
        },
      ];
      $rootScope.$digest();
      expect($rootScope.agg.params.orderBy).to.be('_key');
    });

    // should be rewritten after EUIficate order_agg.html
    it.skip('selects _key if the selected metric is removed', function() {
      init({
        metricAggs: [
          {
            id: 'agg1',
            type: {
              name: 'count',
            },
          },
        ],
      });
      expect($rootScope.agg.params.orderBy).to.be('agg1');
      $rootScope.metricAggs = [];
      $rootScope.$digest();
      expect($rootScope.agg.params.orderBy).to.be('_key');
    });

    describe.skip('custom field formatter', () => {
      beforeEach(() => {
        init({
          metricAggs: [
            {
              id: 'agg1',
              type: {
                name: 'count',
              },
            },
          ],
          aggParams: {
            otherBucketLabel: 'Other',
            missingBucketLabel: 'Missing',
          },
        });
        $rootScope.$digest();
      });

      it('converts __other__ key', () => {
        const formatter = $rootScope.agg.type.getFormat($rootScope.agg).getConverterFor('text');
        expect(formatter('__other__')).to.be('Other');
      });

      it('converts __missing__ key', () => {
        const formatter = $rootScope.agg.type.getFormat($rootScope.agg).getConverterFor('text');
        expect(formatter('__missing__')).to.be('Missing');
      });
    });

    it('adds "custom metric" option');
    it('lists all metric agg responses');
    it('lists individual values of a multi-value metric');
    it('displays a metric editor if "custom metric" is selected');
    it('saves the "custom metric" to state and refreshes from it');
    it('invalidates the form if the metric agg form is not complete');

    describe.skip('convert include/exclude from old format', function() {
      it('it doesnt do anything with string type', function() {
        init({
          aggParams: {
            include: '404',
            exclude: '400',
            field: {
              type: 'string',
            },
          },
        });

        const aggConfig = $rootScope.agg;
        const includeArg = $rootScope.agg.type.params.byName.include;
        const excludeArg = $rootScope.agg.type.params.byName.exclude;

        expect(includeArg.serialize(aggConfig.params.include, aggConfig)).to.equal('404');
        expect(excludeArg.serialize(aggConfig.params.exclude, aggConfig)).to.equal('400');

        const output = { params: {} };

        includeArg.write(aggConfig, output);
        excludeArg.write(aggConfig, output);

        expect(output.params.include).to.equal('404');
        expect(output.params.exclude).to.equal('400');
      });

      it('converts object to string type', function() {
        init({
          aggParams: {
            include: {
              pattern: '404',
            },
            exclude: {
              pattern: '400',
            },
            field: {
              type: 'string',
            },
          },
        });

        const aggConfig = $rootScope.agg;
        const includeArg = $rootScope.agg.type.params.byName.include;
        const excludeArg = $rootScope.agg.type.params.byName.exclude;

        expect(includeArg.serialize(aggConfig.params.include, aggConfig)).to.equal('404');
        expect(excludeArg.serialize(aggConfig.params.exclude, aggConfig)).to.equal('400');

        const output = { params: {} };

        includeArg.write(aggConfig, output);
        excludeArg.write(aggConfig, output);

        expect(output.params.include).to.equal('404');
        expect(output.params.exclude).to.equal('400');
      });
    });
  });
});
