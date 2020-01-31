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

import $ from 'jquery';
import _ from 'lodash';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { VisProvider } from '../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('visualize_legend directive', function() {
  let $rootScope;
  let $compile;
  let $timeout;
  let $el;
  let Vis;
  let indexPattern;
  let fixtures;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(
    ngMock.inject(function(Private, $injector) {
      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');
      $timeout = $injector.get('$timeout');
      fixtures = require('fixtures/fake_hierarchical_data');
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    })
  );

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.aggs.forEach(function(agg, i) {
      agg.id = 'agg_' + (i + 1);
    });

    $rootScope.vis = vis;
    $rootScope.visData = esResponse;
    $rootScope.uiState = require('fixtures/mock_ui_state');
    $el = $('<vislib-legend>');
    $compile($el)($rootScope);
    $rootScope.$apply();
  }

  function CreateVis(params, requiresSearch) {
    const vis = new Vis(indexPattern, {
      type: 'line',
      params: params || {},
      aggs: [
        { type: 'count', schema: 'metric' },
        {
          type: 'range',
          schema: 'bucket',
          params: {
            field: 'bytes',
            ranges: [{ from: 0, to: 1000 }, { from: 1000, to: 2000 }],
          },
        },
      ],
    });

    vis.type.requestHandler = requiresSearch ? 'default' : 'none';
    vis.type.responseHandler = 'none';
    vis.type.requiresSearch = false;
    return vis;
  }

  it('calls highlight handler when highlight function is called', () => {
    const requiresSearch = false;
    const vis = new CreateVis(null, requiresSearch);
    init(vis, fixtures.oneRangeBucket);
    let highlight = 0;
    _.set(vis, 'vislibVis.handler.highlight', () => {
      highlight++;
    });
    $rootScope.highlight({ currentTarget: null });
    expect(highlight).to.equal(1);
  });

  it('calls unhighlight handler when unhighlight function is called', () => {
    const requiresSearch = false;
    const vis = new CreateVis(null, requiresSearch);
    init(vis, fixtures.oneRangeBucket);
    let unhighlight = 0;
    _.set(vis, 'vislibVis.handler.unHighlight', () => {
      unhighlight++;
    });
    $rootScope.unhighlight({ currentTarget: null });
    expect(unhighlight).to.equal(1);
  });

  describe('setColor function', () => {
    beforeEach(() => {
      const requiresSearch = false;
      const vis = new CreateVis(null, requiresSearch);
      init(vis, fixtures.oneRangeBucket);
    });

    it('sets the color in the UI state', () => {
      $rootScope.setColor('test', '#ffffff');
      const colors = $rootScope.uiState.get('vis.colors');
      expect(colors.test).to.equal('#ffffff');
    });
  });

  describe('toggleLegend function', () => {
    let vis;

    beforeEach(() => {
      const requiresSearch = false;
      vis = new CreateVis(null, requiresSearch);
      init(vis, fixtures.oneRangeBucket);
    });

    it('sets the color in the UI state', () => {
      $rootScope.open = true;
      $rootScope.toggleLegend();
      $rootScope.$digest();
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      let legendOpen = $rootScope.uiState.get('vis.legendOpen');
      expect(legendOpen).to.equal(false);

      $rootScope.toggleLegend();
      $rootScope.$digest();
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      legendOpen = $rootScope.uiState.get('vis.legendOpen');
      expect(legendOpen).to.equal(true);
    });
  });

  it('does not update scope.data if visData is null', () => {
    $rootScope.visData = null;
    $rootScope.$digest();
    expect($rootScope.data).to.not.equal(null);
  });

  it('works without handler set', () => {
    const requiresSearch = false;
    const vis = new CreateVis(null, requiresSearch);
    vis.vislibVis = {};
    init(vis, fixtures.oneRangeBucket);
    expect(() => {
      $rootScope.highlight({ currentTarget: null });
      $rootScope.unhighlight({ currentTarget: null });
    }).to.not.throwError();
  });
});
