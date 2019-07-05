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
import $ from 'jquery';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import LineVisTypeProvider from '../../line';
import { VisProvider } from 'ui/vis';
import { AggConfig } from 'ui/vis/agg_config';

describe('point series editor', function () {
  let $parentScope;
  let $container;
  let $elem;
  let lineVisType;
  let Vis;
  let indexPattern;

  function makeConfig() {
    return {
      type: 'line',
      params: lineVisType.visConfig.defaults,
      aggs: [
        { type: 'count', schema: 'metric', params: { field: 'bytes' } },
        { type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
      ],
      listeners: { click: _.noop }
    };
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($rootScope, $compile, Private) {
    lineVisType = Private(LineVisTypeProvider);
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    $parentScope = $rootScope;
    $parentScope.vis = new Vis(indexPattern, makeConfig());
    $parentScope.editorState = {
      params: $parentScope.vis.params,
      aggs: $parentScope.vis.aggs,
    };
    $parentScope.savedVis = {};

    // share the scope
    //_.defaults($parentScope, $rootScope, Object.getPrototypeOf($rootScope));

    $container = $(document.createElement('div'))
      .appendTo('body');
    // make the element
    $elem = angular.element('<div><vislib-series></vislib-series><vislib-value-axes>' +
      '</vislib-value-axes><vislib-category-axis></vislib-category-axis></div>');
    $container.append($elem);

    // compile the html
    $compile($elem)($parentScope);

    // Digest everything
    $elem.scope().$digest();
  }));

  afterEach(function () {
    $container.remove();
  });

  it('should show correct series', function () {
    expect($parentScope.editorState.params.seriesParams.length).to.be(1);
    expect($parentScope.editorState.params.seriesParams[0].data.label).to.be('Count');
  });

  it('should update series when new agg is added', function () {
    const aggConfig = new AggConfig($parentScope.vis.aggs, { type: 'avg', schema: 'metric', params: { field: 'bytes' } });
    $parentScope.vis.aggs.push(aggConfig);
    $parentScope.$digest();
    expect($parentScope.editorState.params.seriesParams.length).to.be(2);
  });

  it('should only allow left and right value axis position when category axis is horizontal', function () {
    expect($parentScope.isPositionDisabled('top')).to.be(true);
    expect($parentScope.isPositionDisabled('bottom')).to.be(true);
    expect($parentScope.isPositionDisabled('left')).to.be(false);
    expect($parentScope.isPositionDisabled('right')).to.be(false);
  });

  it('should only allow top and bottom value axis position when category axis is vertical', function () {
    $parentScope.editorState.params.categoryAxes[0].position = 'left';
    $parentScope.$digest();
    expect($parentScope.editorState.params.valueAxes[0].position).to.be('bottom');
    expect($parentScope.isPositionDisabled('top')).to.be(false);
    expect($parentScope.isPositionDisabled('bottom')).to.be(false);
    expect($parentScope.isPositionDisabled('left')).to.be(true);
    expect($parentScope.isPositionDisabled('right')).to.be(true);
  });

  it('should add value axis', function () {
    $parentScope.addValueAxis();
    expect($parentScope.editorState.params.valueAxes.length).to.be(2);
  });

  it('should remove value axis', function () {
    $parentScope.addValueAxis();
    $parentScope.removeValueAxis({ id: 'ValueAxis-2' });
    expect($parentScope.editorState.params.valueAxes.length).to.be(1);
  });

  it('should not allow to remove the last value axis', function () {
    $parentScope.removeValueAxis({ id: 'ValueAxis-1' });
    expect($parentScope.editorState.params.valueAxes.length).to.be(1);
  });

  it('should set the value axis title if its not set', function () {
    $parentScope.updateAxisTitle();
    expect($parentScope.editorState.params.valueAxes[0].title.text).to.equal('Count');
  });

  it('should not update the value axis title if custom title was set', function () {
    $parentScope.editorState.params.valueAxes[0].title.text = 'Custom Title';
    $parentScope.updateAxisTitle();
    expect($parentScope.editorState.params.valueAxes[0].title.text).to.equal('Custom Title');
  });

  it('should set the custom title to match the value axis label when only one agg exists for that axis', function () {
    $parentScope.editorState.aggs[0].params.customLabel = 'Custom Label';
    $parentScope.updateAxisTitle();
    expect($parentScope.editorState.params.valueAxes[0].title.text).to.equal('Custom Label');
  });

  it('should not set the custom title to match the value axis label when more than one agg exists for that axis', function () {
    const aggConfig = new AggConfig($parentScope.vis.aggs, { type: 'avg', schema: 'metric', params: { field: 'bytes' } });
    $parentScope.vis.aggs.push(aggConfig);
    $parentScope.$digest();
    $parentScope.editorState.aggs[0].params.customLabel = 'Custom Label';
    $parentScope.updateAxisTitle();
    expect($parentScope.editorState.params.valueAxes[0].title.text).to.equal('Count');
  });

  it('should not overwrite the custom title with the value axis label if the custom title has been changed', function () {
    $parentScope.editorState.params.valueAxes[0].title.text = 'Custom Title';
    $parentScope.editorState.aggs[0].params.customLabel = 'Custom Label';
    $parentScope.updateAxisTitle();
    expect($parentScope.editorState.params.valueAxes[0].title.text).to.equal('Custom Title');
  });

  it('should overwrite the custom title when the agg type changes', function () {
    const aggConfig = new AggConfig($parentScope.vis.aggs, { type: 'avg', schema: 'metric', params: { field: 'bytes' } });

    $parentScope.editorState.params.valueAxes[0].title.text = 'Custom Title';
    $parentScope.editorState.aggs[0].params.customLabel = 'Custom Label';
    $parentScope.updateAxisTitle();

    $parentScope.vis.aggs.push(aggConfig);
    $parentScope.vis.aggs.shift();
    $parentScope.$digest();
    $parentScope.updateAxisTitle();

    expect($parentScope.editorState.params.valueAxes[0].title.text).to.equal('Average bytes');
  });
});
