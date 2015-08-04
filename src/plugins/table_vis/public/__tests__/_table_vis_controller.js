describe('Controller', function () {
  var $ = require('jquery');
  var _ = require('lodash');
  var expect = require('expect.js');
  var ngMock = require('ngMock');
  var sinon = require('auto-release-sinon');

  var $rootScope;
  var TableGroup;
  var $compile;
  var Private;
  var $scope;
  var $el;
  var Vis;
  var fixtures;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function ($injector) {
    Private = $injector.get('Private');
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    fixtures = require('fixtures/fake_hierarchical_data');
    TableGroup = Private(require('ui/agg_response/tabify/_table_group'));
    Vis = Private(require('ui/Vis'));
  }));

  function OneRangeVis(params) {
    return new Vis(
      Private(require('fixtures/stubbed_logstash_index_pattern')),
      {
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
      }
    );
  }

  // basically a parameterized beforeEach
  function initController(vis) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    $rootScope.vis = vis;
    $rootScope.newScope = function (scope) { $scope = scope; };

    $el = $('<div>')
      .attr('ng-controller', 'KbnTableVisController')
      .attr('ng-init', 'newScope(this)');

    $compile($el)($rootScope);
  }

  // put a response into the controller
  function attachEsResponseToScope(resp) {
    $rootScope.esResponse = resp || fixtures.oneRangeBucket;
    $rootScope.$apply();
  }

  // remove the response from the controller
  function removeEsResponseFromScope() {
    delete $rootScope.esResponse;
    $rootScope.$apply();
  }

  it('exposes #tableGroups and #hasSomeRows when a response is attached to scope', function () {
    initController(new OneRangeVis());

    expect(!$scope.tableGroups).to.be.ok();
    expect(!$scope.hasSomeRows).to.be.ok();

    attachEsResponseToScope(fixtures.oneRangeBucket);

    expect($scope.hasSomeRows).to.be(true);
    expect($scope.tableGroups).to.have.property('tables');
    expect($scope.tableGroups.tables).to.have.length(1);
    expect($scope.tableGroups.tables[0].columns).to.have.length(2);
    expect($scope.tableGroups.tables[0].rows).to.have.length(2);
  });

  it('clears #tableGroups and #hasSomeRows when the response is removed', function () {
    initController(new OneRangeVis());

    attachEsResponseToScope(fixtures.oneRangeBucket);
    removeEsResponseFromScope();

    expect(!$scope.hasSomeRows).to.be.ok();
    expect(!$scope.tableGroups).to.be.ok();
  });

  it('sets #hasSomeRows properly if the table group is empty', function () {
    initController(new OneRangeVis());

    // modify the data to not have any buckets
    var resp = _.cloneDeep(fixtures.oneRangeBucket);
    resp.aggregations.agg_2.buckets = {};

    attachEsResponseToScope(resp);

    expect($scope.hasSomeRows).to.be(false);
    expect(!$scope.tableGroups).to.be.ok();
  });

  it('passes partialRows:true to tabify based on the vis params', function () {
    // spy on the tabify private module
    var tabifyPm = require('ui/agg_response/tabify/tabify');
    var spiedTabify = sinon.spy(Private(tabifyPm));
    Private.stub(tabifyPm, spiedTabify);

    var vis = new OneRangeVis({ showPartialRows: true });
    initController(vis);
    attachEsResponseToScope(fixtures.oneRangeBucket);

    expect(spiedTabify).to.have.property('callCount', 1);
    expect(spiedTabify.firstCall.args[2]).to.have.property('partialRows', true);
  });

  it('passes partialRows:false to tabify based on the vis params', function () {
    // spy on the tabify private module
    var tabifyPm = require('ui/agg_response/tabify/tabify');
    var spiedTabify = sinon.spy(Private(tabifyPm));
    Private.stub(tabifyPm, spiedTabify);

    var vis = new OneRangeVis({ showPartialRows: false });
    initController(vis);
    attachEsResponseToScope(fixtures.oneRangeBucket);

    expect(spiedTabify).to.have.property('callCount', 1);
    expect(spiedTabify.firstCall.args[2]).to.have.property('partialRows', false);
  });

  it('passes partialRows:true to tabify based on the vis params', function () {
    // spy on the tabify private module
    var tabifyPm = require('ui/agg_response/tabify/tabify');
    var spiedTabify = sinon.spy(Private(tabifyPm));
    Private.stub(tabifyPm, spiedTabify);

    var vis = new OneRangeVis({ showPartialRows: true });
    initController(vis);
    attachEsResponseToScope(fixtures.oneRangeBucket);

    expect(spiedTabify).to.have.property('callCount', 1);
    expect(spiedTabify.firstCall.args[2]).to.have.property('partialRows', true);
  });

  it('passes partialRows:false to tabify based on the vis params', function () {
    // spy on the tabify private module
    var tabifyPm = require('ui/agg_response/tabify/tabify');
    var spiedTabify = sinon.spy(Private(tabifyPm));
    Private.stub(tabifyPm, spiedTabify);

    var vis = new OneRangeVis({ showPartialRows: false });
    initController(vis);
    attachEsResponseToScope(fixtures.oneRangeBucket);

    expect(spiedTabify).to.have.property('callCount', 1);
    expect(spiedTabify.firstCall.args[2]).to.have.property('partialRows', false);
  });
});
