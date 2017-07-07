import angular from 'angular';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import LineVisTypeProvider from 'plugins/kbn_vislib_vis_types/line';
import { VisProvider } from 'ui/vis';
import { VisAggConfigProvider } from 'ui/vis/agg_config';

describe('point series editor', function () {
  let $parentScope;
  let $container;
  let $elem;
  let lineVisType;
  let Vis;
  let indexPattern;
  let AggConfig;

  function makeConfig() {
    return {
      type: 'line',
      params: lineVisType.params.defaults,
      aggs: [
        { type: 'count', schema: 'metric', params: { field: 'bytes' } },
        { type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
      ],
      listeners: { click: _.noop }
    };
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($rootScope, $compile, Private) {
    AggConfig = Private(VisAggConfigProvider);
    lineVisType = Private(LineVisTypeProvider);
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    $parentScope = $rootScope;
    $parentScope.vis = new Vis(indexPattern, makeConfig());
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
    expect($parentScope.vis.params.seriesParams.length).to.be(1);
    expect($parentScope.vis.params.seriesParams[0].data.label).to.be('Count');
  });

  it('should update series when new agg is added', function () {
    const aggConfig = new AggConfig($parentScope.vis, { type: 'avg', schema: 'metric', params: { field: 'bytes' } });
    $parentScope.vis.aggs.push(aggConfig);
    $parentScope.$digest();
    expect($parentScope.vis.params.seriesParams.length).to.be(2);
  });

  it('should only allow left and right value axis position when category axis is horizontal', function () {
    expect($parentScope.isPositionDisabled('top')).to.be(true);
    expect($parentScope.isPositionDisabled('bottom')).to.be(true);
    expect($parentScope.isPositionDisabled('left')).to.be(false);
    expect($parentScope.isPositionDisabled('right')).to.be(false);
  });

  it('should only allow top and bottom value axis position when category axis is vertical', function () {
    $parentScope.vis.params.categoryAxes[0].position = 'left';
    $parentScope.$digest();
    expect($parentScope.vis.params.valueAxes[0].position).to.be('bottom');
    expect($parentScope.isPositionDisabled('top')).to.be(false);
    expect($parentScope.isPositionDisabled('bottom')).to.be(false);
    expect($parentScope.isPositionDisabled('left')).to.be(true);
    expect($parentScope.isPositionDisabled('right')).to.be(true);
  });

  it('should add value axis', function () {
    $parentScope.addValueAxis();
    expect($parentScope.vis.params.valueAxes.length).to.be(2);
  });

  it('should remove value axis', function () {
    $parentScope.addValueAxis();
    $parentScope.removeValueAxis({ id: 'ValueAxis-2' });
    expect($parentScope.vis.params.valueAxes.length).to.be(1);
  });

  it('should not allow to remove the last value axis', function () {
    $parentScope.removeValueAxis({ id: 'ValueAxis-1' });
    expect($parentScope.vis.params.valueAxes.length).to.be(1);
  });
});
