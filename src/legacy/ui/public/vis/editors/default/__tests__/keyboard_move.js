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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { Direction } from '../keyboard_move';
import { keyCodes } from '@elastic/eui';

describe('keyboardMove directive', () => {

  let $compile;
  let $rootScope;

  function createTestButton(callback) {
    const scope = $rootScope.$new();
    scope.callback = callback;
    return $compile('<button keyboard-move="callback(direction)">Test</button>')(scope);
  }

  function createKeydownEvent(keyCode) {
    const e = angular.element.Event('keydown'); // eslint-disable-line new-cap
    e.which = keyCode;
    return e;
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((_$rootScope_, _$compile_) => {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  it('should call the callback when pressing up', () => {
    const spy = sinon.spy();
    const button = createTestButton(spy);
    button.trigger(createKeydownEvent(keyCodes.UP));
    expect(spy.calledWith(Direction.up)).to.be(true);
  });

  it('should call the callback when pressing down', () => {
    const spy = sinon.spy();
    const button = createTestButton(spy);
    button.trigger(createKeydownEvent(keyCodes.DOWN));
    expect(spy.calledWith(Direction.down)).to.be(true);
  });
});
