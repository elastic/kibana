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
import '../agg';


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
