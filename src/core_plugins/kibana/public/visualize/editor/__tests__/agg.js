
import angular from 'angular';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'plugins/kibana/visualize/editor/agg';


describe('Vis-Editor-Agg plugin directive', function () {
  const $parentScope = {};
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
  beforeEach(ngMock.inject(function ($rootScope, $compile) {
    $parentScope.agg = {
      id: 1,
      params: {},
      schema: makeConfig(),
      getFieldOptions: () => null
    };
    $parentScope.groupName = 'metrics';
    $parentScope.group = [{
      id: '1',
      schema: makeConfig()
    }, {
      id: '2',
      schema: makeConfig('radius')
    }];

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
  }));

  it('should only add the close button if there is more than the minimum', function () {
    expect($parentScope.canRemove($parentScope.agg)).to.be(false);
    $parentScope.group.push({
      id: '3',
      schema: makeConfig()
    });
    expect($parentScope.canRemove($parentScope.agg)).to.be(true);
  });
});
