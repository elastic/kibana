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

describe('Significant Terms Agg', function() {
  describe('order agg editor UI', function() {
    describe('convert include/exclude from old format', function() {
      let $rootScope;

      function init({ aggParams = {} }) {
        ngMock.module('kibana');
        ngMock.inject(function(_$rootScope_) {
          const significantTerms = aggTypes.buckets.find(agg => agg.name === 'significant_terms');

          $rootScope = _$rootScope_;
          $rootScope.agg = {
            id: 'test',
            params: aggParams,
            type: significantTerms,
            getParam: key => aggParams[key],
          };
        });
      }

      function testSerializeAndWrite(aggConfig) {
        const includeArg = $rootScope.agg.type.paramByName('include');
        const excludeArg = $rootScope.agg.type.paramByName('exclude');

        expect(includeArg.serialize(aggConfig.params.include, aggConfig)).to.equal('404');
        expect(excludeArg.serialize(aggConfig.params.exclude, aggConfig)).to.equal('400');

        const output = { params: {} };

        includeArg.write(aggConfig, output);
        excludeArg.write(aggConfig, output);

        expect(output.params.include).to.equal('404');
        expect(output.params.exclude).to.equal('400');
      }

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

        testSerializeAndWrite($rootScope.agg);
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

        testSerializeAndWrite($rootScope.agg);
      });
    });
  });
});
