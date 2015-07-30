
var angular = require('angular');
var expect = require('expect.js');
var $ = require('jquery');
var _ = require('lodash');
var sinon = require('auto-release-sinon');
var searchResponse = require('fixtures/search_response');
var ngMock = require('ngMock');

// Load the kibana app dependencies.
require('ui/private');
require('ui/doc_table');


var $parentScope, $scope, $timeout, searchSource;

var init = function ($elem, props) {
  ngMock.inject(function ($rootScope, $compile, _$timeout_) {
    $timeout = _$timeout_;
    $parentScope = $rootScope;
    _.assign($parentScope, props);

    $compile($elem)($parentScope);

    // I think the prereq requires this?
    $timeout(function () {
      $elem.scope().$digest();
    }, 0);

    $scope = $elem.isolateScope();

  });
};

var destroy = function () {
  $scope.$destroy();
  $parentScope.$destroy();
};

describe('docTable', function () {
  var $elem;

  beforeEach(ngMock.module('kibana'));
  beforeEach(function () {
    $elem = angular.element('<doc-table search-source="searchSource" columns="columns" sorting="sorting"></doc-table>');
    ngMock.inject(function (Private) {
      searchSource = Private(require('fixtures/stubbed_search_source'));
    });
    init($elem, {
      searchSource: searchSource,
      columns: [],
      sorting: ['@timestamp', 'desc']
    });
    $scope.$digest();

  });

  afterEach(function () {
    destroy();
  });

  it('should compile', function () {
    expect($elem.text()).to.not.be.empty();
  });

  it('should set the indexPattern to that of the searchSource', function () {
    expect($scope.indexPattern).to.be(searchSource.get('index'));
  });

  it('should set size and sort on the searchSource', function () {
    expect($scope.searchSource.sort.called).to.be(true);
    expect($scope.searchSource.size.called).to.be(true);
  });

  it('should have an addRows function that increases the row count', function () {
    expect($scope.addRows).to.be.a(Function);
    searchSource.crankResults();
    $scope.$digest();
    expect($scope.limit).to.be(50);
    $scope.addRows();
    expect($scope.limit).to.be(100);
  });

  it('should reset the row limit when results are received', function () {
    $scope.limit = 100;
    expect($scope.limit).to.be(100);
    searchSource.crankResults();
    $scope.$digest();
    expect($scope.limit).to.be(50);
  });

  it('should put the hits array on scope', function () {
    expect($scope.hits).to.be(undefined);
    searchSource.crankResults();
    $scope.$digest();
    expect($scope.hits).to.be.an(Array);
  });

  it('should destroy the searchSource when the scope is destroyed', function () {
    expect(searchSource.destroy.called).to.be(false);
    $scope.$destroy();
    expect(searchSource.destroy.called).to.be(true);
  });

  it('should have a header and a table element', function () {
    searchSource.crankResults();
    $scope.$digest();

    expect($elem.find('thead').length).to.be(1);
    expect($elem.find('table').length).to.be(1);
  });

});