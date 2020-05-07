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

import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '..';
import { EventsProvider } from '../../../events';

describe('listen component', function() {
  let $rootScope;
  let Events;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($injector, Private) {
      $rootScope = $injector.get('$rootScope');
      Events = Private(EventsProvider);
    })
  );

  it('exposes the $listen method on all scopes', function() {
    expect($rootScope.$listen).to.be.a('function');
    expect($rootScope.$new().$listen).to.be.a('function');
  });

  it('binds to an event emitter', function() {
    const emitter = new Events();
    const $scope = $rootScope.$new();

    function handler() {}
    $scope.$listen(emitter, 'hello', handler);

    expect(emitter._listeners.hello).to.have.length(1);
    expect(emitter._listeners.hello[0].handler).to.be(handler);
  });

  it('binds to $scope, waiting for the destroy event', function() {
    const emitter = new Events();
    const $scope = $rootScope.$new();

    sinon.stub($scope, '$on');
    sinon.stub($rootScope, '$on');

    function handler() {}
    $scope.$listen(emitter, 'hello', handler);

    expect($rootScope.$on).to.have.property('callCount', 0);
    expect($scope.$on).to.have.property('callCount', 1);

    const call = $scope.$on.firstCall;
    expect(call.args[0]).to.be('$destroy');
    expect(call.args[1]).to.be.a('function');
  });

  it('unbinds the event handler when $destroy is triggered', function() {
    const emitter = new Events();
    const $scope = $rootScope.$new();

    sinon.stub($scope, '$on');
    sinon.stub(emitter, 'off');

    // set the listener
    function handler() {}
    $scope.$listen(emitter, 'hello', handler);

    // get the unbinder that was registered to $scope
    const unbinder = $scope.$on.firstCall.args[1];

    // call the unbinder
    expect(emitter.off).to.have.property('callCount', 0);
    unbinder();
    expect(emitter.off).to.have.property('callCount', 1);

    // check that the off args were as expected
    const call = emitter.off.firstCall;
    expect(call.args[0]).to.be('hello');
    expect(call.args[1]).to.be(handler);
  });
});
