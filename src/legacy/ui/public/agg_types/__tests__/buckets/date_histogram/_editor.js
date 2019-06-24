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
import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VisProvider } from '../../../../vis';
import { intervalOptions } from '../../../buckets/_interval_options';

describe('editor', function () {

  let indexPattern;
  let vis;
  let agg;
  let render;
  let $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector, $compile) {
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

    const Vis = Private(VisProvider);

    /**
     * Render the AggParams editor for the date histogram aggregation
     *
     * @param  {object} params - the agg params to give to the date_histogram
     *                           by default
     * @return {object} - object pointing to the different inputs, keys
     *                    are the aggParam name and the value is an object
     *                    with $el, $scope, and a few helpers for getting
     *                    data from them.
     */
    render = function (params) {
      vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { schema: 'metric', type: 'avg', params: { field: 'bytes' } },
          { schema: 'segment', type: 'date_histogram', params: params || {} }
        ]
      });

      const $el = $('<vis-editor-agg-params agg="agg" ' +
        'index-pattern="agg.getIndexPattern()" ' +
        'group-name="groupName">' +
        '</vis-editor-agg-params>');
      const $parentScope = $injector.get('$rootScope').$new();

      agg = $parentScope.agg = vis.aggs.bySchemaName.segment[0];
      $parentScope.groupName = 'buckets';
      $parentScope.vis = vis;

      $compile($el)($parentScope);
      $scope = $el.scope();
      $scope.$digest();

      const $inputs = $('vis-agg-param-editor', $el);
      return _.transform($inputs.toArray(), function (inputs, e) {
        const $el = $(e);
        const $scope = $el.scope();

        inputs[$scope.aggParam.name] = {
          $el: $el,
          $scope: $scope,
          $input: function () {
            return $el.find('[ng-model]').first();
          },
          modelValue: function () {
            return this.$input().controller('ngModel').$modelValue;
          }
        };
      }, {});
    };

  }));

  describe('random field/interval', function () {
    let params;
    let field;
    let interval;

    beforeEach(ngMock.inject(function () {
      field = _.sample(indexPattern.fields);
      interval = _.sample(intervalOptions);
      params = render({ field: field, interval: interval.val });
    }));

    it('renders the field editor', function () {
      expect(agg.params.field).to.be(field);

      expect(params).to.have.property('field');
      expect(params.field).to.have.property('$el');
      expect($scope.agg.params.field).to.be(field);
    });

    it('renders the interval editor', function () {
      expect(agg.params.interval).to.be(interval.val);

      expect(params).to.have.property('interval');
      expect(params.interval).to.have.property('$el');
      expect($scope.agg.params.interval).to.be(interval.val);
    });
  });


});
