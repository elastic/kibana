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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
describe('$scope.$bind', function() {
  let $rootScope;
  let $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($injector) {
      $rootScope = $injector.get('$rootScope');
      $scope = $rootScope.$new();
    })
  );

  it('exposes $bind on all scopes', function() {
    expect($rootScope.$bind).to.be.a('function');
    expect($scope).to.have.property('$bind', $rootScope.$bind);

    const $isoScope = $scope.$new(true);
    expect($isoScope).to.have.property('$bind', $rootScope.$bind);
  });

  it("sets up binding from a parent scope to it's child", function() {
    $rootScope.val = 'foo';
    $scope.$bind('localVal', 'val');
    expect($scope.localVal).to.be('foo');

    $rootScope.val = 'bar';
    expect($scope.localVal).to.be('foo'); // shouldn't have changed yet

    $rootScope.$apply();
    expect($scope.localVal).to.be('bar');
  });

  it('sets up a binding from the child to the parent scope', function() {
    $rootScope.val = 'foo';
    $scope.$bind('localVal', 'val');
    expect($scope.localVal).to.be('foo');

    $scope.localVal = 'bar';
    expect($rootScope.val).to.be('foo'); // shouldn't have changed yet

    $scope.$apply();
    expect($rootScope.val).to.be('bar');
  });

  it('pulls from the scopes $parent by default', function() {
    const $parent = $rootScope.$new();
    const $self = $parent.$new();

    $parent.val = 'foo';
    $self.val = 'bar';

    $self.$bind('localVal', 'val');
    expect($self.localVal).to.be('foo');
  });

  it('accepts an alternate scope to read from', function() {
    const $parent = $rootScope.$new();
    const $self = $parent.$new();

    $parent.val = 'foo';
    $self.val = 'bar';

    $self.$bind('localVal', 'val', $self);
    expect($self.localVal).to.be('bar');
  });
});
