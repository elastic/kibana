
import angular from 'angular';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import 'plugins/kibana/visualize/editor/agg';


describe('Vis-Editor-Agg plugin directive', function () {
  const $parentScope = {};
  let $scope;
  let $elem;

  function makeConfig(which) {
    const schemaMap = {
      radius: {
        title: 'Dot Size',
        min: 0,
        max: 1
      },
      metric: {
        title: 'Y-Axis',
        min: 1,
        max: Infinity
      }
    };
    const typeOptions = ['count', 'avg', 'sum', 'min', 'max', 'cardinality'];
    which = which || 'metric';

    const schema = schemaMap[which];

    return {
      min: schema.min,
      max: schema.max,
      name: which,
      title: schema.title,
      group: 'metrics',
      aggFilter: typeOptions,
      // AggParams object
      params: []
    };
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(function () {
    $parentScope.agg = {
      id: 1,
      params: {},
      schema: makeConfig()
    };
    $parentScope.groupName = 'metrics';
    $parentScope.group = [{
      id: '1',
      schema: makeConfig()
    }, {
      id: '2',
      schema: makeConfig('radius')
    }];
    $parentScope.stats = { count: 1 };
    $parentScope.vis = {
      type: { name: 'histogram' }
    };
  });
  beforeEach(ngMock.inject(function ($rootScope, $compile) {
    // share the scope
    _.defaults($parentScope, $rootScope, Object.getPrototypeOf($rootScope));

    // make the element
    $elem = angular.element(
      '<ng-form vis-editor-agg></ng-form>'
    );

    // compile the html
    $compile($elem)($parentScope);

    // Digest everything
    $elem.scope().$digest();

    // give us a scope to work with
    $scope = $elem.isolateScope();
  }));

  // cleanup after test case
  afterEach(function () {
    $parentScope.$destroy();
  });

  it('should only add the close button if there is more than the minimum', function () {
    expect($parentScope.canRemove($parentScope.agg)).to.be(false);
    $parentScope.group.push({
      id: '3',
      schema: makeConfig()
    });
    expect($parentScope.canRemove($parentScope.agg)).to.be(true);
  });

  it('can be secondary axis only for line graph with more than 2 y axis', function () {
    $parentScope.stats.count = 2;
    $parentScope.vis.type.name = 'line';

    expect($parentScope.canBeSecondaryYAxis()).to.be(true);
  });

  it('can not be secondary axis non metric schema', function () {
    $parentScope.agg.schema.name = 'non-metric';

    expect($parentScope.canBeSecondaryYAxis()).to.be(false);
  });

  it('can not be secondary axis non y-axis title', function () {
    $parentScope.agg.schema.title = 'non-y-axis';

    expect($parentScope.canBeSecondaryYAxis()).to.be(false);
  });

  it('can not be secondary axis for histogram graph with 2 y axis', function () {
    $parentScope.stats.count = 2;
    $parentScope.vis.type.name = 'histogram';

    expect($parentScope.canBeSecondaryYAxis()).to.be(false);
  });

  it('can not be secondary axis for line graph with only 1 y axis', function () {
    $parentScope.stats.count = 1;
    $parentScope.vis.type.name = 'line';

    expect($parentScope.canBeSecondaryYAxis()).to.be(false);
  });
});
