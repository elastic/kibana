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


import angular from 'angular';
import _ from 'lodash';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '../agg_params';
import { VisProvider } from '../../..';
import { AggConfig } from '../../../agg_config';
import { Schemas } from '../schemas';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';


describe('Vis-Editor-Agg-Params plugin directive', function () {
  let $parentScope = {};
  let Vis;
  let vis;
  let $elem;
  let compile;
  let rootScope;

  const aggFilter = [
    '!top_hits', '!percentiles', '!median', '!std_dev',
    '!derivative', '!cumulative_sum', '!moving_avg', '!serial_diff'
  ];

  let indexPattern;
  let orderAggSchema;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $rootScope, $compile) {
    rootScope = $rootScope;
    compile = $compile;

    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  function init(config) {
    $parentScope = {};
    _.defaults($parentScope, rootScope, Object.getPrototypeOf(rootScope));

    orderAggSchema = (new Schemas([config])).all[0];
    $parentScope.groupName = 'metrics';

    const state = {
      schema: orderAggSchema,
      type: 'count'
    };

    vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        {
          type: 'date_histogram',
          schema: 'segment'
        }
      ]
    });

    $parentScope.agg = new AggConfig(vis.aggs, state);
    $parentScope.vis = vis;

    // make the element
    $elem = angular.element(
      `<vis-editor-agg-params index-pattern="vis.indexPattern" agg="agg" group-name="groupName"></vis-editor-agg-params>`
    );

    // compile the html
    compile($elem)($parentScope);

    // Digest everything
    $elem.scope().$digest();
  }

  afterEach(function () {
    $parentScope.$destroy();
    $parentScope = null;
  });

  it('should show custom label parameter', function () {
    init ({
      group: 'none',
      name: 'orderAgg',
      title: 'Order Agg',
      aggFilter: aggFilter
    });

    const customLabelElement = $elem.find('label:contains("Custom label")');
    expect(customLabelElement.length).to.be(1);
  });

  it('should hide custom label parameter', function () {
    init ({
      group: 'none',
      name: 'orderAgg',
      title: 'Order Agg',
      hideCustomLabel: true,
      aggFilter: aggFilter
    });

    const customLabelElement = $elem.find('label:contains("Custom label")');
    expect(customLabelElement.length).to.be(0);
  });
});
