
import angular from 'angular';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'plugins/kibana/visualize/editor/agg_params';
import { VisProvider } from 'ui/vis';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import { VisSchemasProvider } from 'ui/vis/schemas';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';


describe('Vis-Editor-Agg-Params plugin directive', function () {
  let $parentScope = {};
  let Vis;
  let vis;
  let AggConfig;
  let Schemas;
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
    Schemas = Private(VisSchemasProvider);
    AggConfig = Private(VisAggConfigProvider);
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

    $parentScope.agg = new AggConfig(vis, state);

    // make the element
    $elem = angular.element(
      `<vis-editor-agg-params agg="agg" group-name="groupName"></vis-editor-agg-params>`
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

    const customLabelElement = $elem.find('label:contains("Custom Label")');
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

    const customLabelElement = $elem.find('label:contains("Custom Label")');
    expect(customLabelElement.length).to.be(0);
  });
});
