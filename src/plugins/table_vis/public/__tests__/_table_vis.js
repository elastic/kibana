import $ from 'jquery';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'auto-release-sinon';
import AggResponseTabifyTableGroupProvider from 'ui/agg_response/tabify/_table_group';
import VisProvider from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
describe('Integration', function () {

  let $rootScope;
  let TableGroup;
  let $compile;
  let $scope;
  let $el;
  let Vis;
  let indexPattern;
  let fixtures;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    fixtures = require('fixtures/fake_hierarchical_data');
    TableGroup = Private(AggResponseTabifyTableGroupProvider);
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  // basically a parameterized beforeEach
  function init(vis, esResponse) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.esResponse = esResponse;
    $rootScope.uiState = require('fixtures/mock_ui_state');
    $el = $('<visualize vis="vis" es-resp="esResponse" ui-state="uiState">');
    $compile($el)($rootScope);
    $rootScope.$apply();

    $scope = $el.isolateScope();
  }

  function OneRangeVis(params) {
    return new Vis(indexPattern, {
      type: 'table',
      params: params || {},
      aggs: [
        { type: 'count', schema: 'metric' },
        {
          type: 'range',
          schema: 'bucket',
          params: {
            field: 'bytes',
            ranges: [
              { from: 0, to: 1000 },
              { from: 1000, to: 2000 }
            ]
          }
        }
      ]
    });
  }

  function ThreeTermVis(params) {
    return new Vis(indexPattern, {
      type: 'table',
      params: params,
      aggs: [
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        {
          type: 'terms',
          schema: 'split',
          params: {
            field: 'extension'
          }
        },
        {
          type: 'terms',
          schema: 'bucket',
          params: {
            field: 'geo.src'
          }
        },
        {
          type: 'terms',
          schema: 'bucket',
          params: {
            field: 'machine.os'
          }
        }
      ]
    });
  }

  it('passes the table groups to the kbnAggTableGroup directive', function () {
    init(new OneRangeVis(), fixtures.oneRangeBucket);

    const $atg = $el.find('kbn-agg-table-group').first();
    expect($atg.size()).to.be(1);
    expect($atg.attr('group')).to.be('tableGroups');
    expect($atg.isolateScope().group).to.be($atg.scope().tableGroups);
  });

  it('displays an error if the search had no hits', function () {
    init(new OneRangeVis(), { hits: { total: 0, hits: [] }});

    expect($el.find('kbn-agg-table-group').size()).to.be(0);

    const $err = $el.find('.table-vis-error');
    expect($err.size()).to.be(1);
    expect($err.text().trim()).to.be('No results found');
  });

  it('displays an error if the search hits, but didn\'t create any rows', function () {
    const visParams = {
      showPartialRows: false,
      metricsAtAllLevels: true
    };

    const resp = _.cloneDeep(fixtures.threeTermBuckets);
    resp.aggregations.agg_2.buckets.forEach(function (extensionBucket) {
      extensionBucket.agg_3.buckets.forEach(function (countryBucket) {
        // clear all the machine os buckets
        countryBucket.agg_4.buckets = [];
      });
    });

    init(new ThreeTermVis(visParams), resp);

    expect($el.find('kbn-agg-table-group').size()).to.be(0);

    const $err = $el.find('.table-vis-error');
    expect($err.size()).to.be(1);
    expect($err.text().trim()).to.be('No results found');
  });
});
