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
import { DebounceProvider } from '..';

let debounce;
let debounceFromProvider;
let $timeout;

function init() {
  ngMock.module('kibana');

  ngMock.inject(function ($injector, _$timeout_, Private) {
    $timeout = _$timeout_;

    debounce = $injector.get('debounce');
    debounceFromProvider = Private(DebounceProvider);
  });
}

describe('debounce service', function () {
  let spy;
  beforeEach(function () {
    spy = sinon.spy();
    init();
  });

  it('should have a cancel method', function () {
    const bouncer = debounce(() => {}, 100);
    const bouncerFromProvider = debounceFromProvider(() => {}, 100);

    expect(bouncer).to.have.property('cancel');
    expect(bouncerFromProvider).to.have.property('cancel');
  });

  describe('delayed execution', function () {
    const sandbox = sinon.createSandbox();

    beforeEach(() => sandbox.useFakeTimers());
    afterEach(() => sandbox.restore());

    it('should delay execution', function () {
      const bouncer = debounce(spy, 100);
      const bouncerFromProvider = debounceFromProvider(spy, 100);

      bouncer();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);

      spy.resetHistory();

      bouncerFromProvider();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
    });

    it('should fire on leading edge', function () {
      const bouncer = debounce(spy, 100, { leading: true });
      const bouncerFromProvider = debounceFromProvider(spy, 100, { leading: true });

      bouncer();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledTwice(spy);

      spy.resetHistory();

      bouncerFromProvider();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledTwice(spy);
    });

    it('should only fire on leading edge', function () {
      const bouncer = debounce(spy, 100, { leading: true, trailing: false });
      const bouncerFromProvider = debounceFromProvider(spy, 100, { leading: true, trailing: false });

      bouncer();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);

      spy.resetHistory();

      bouncerFromProvider();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
    });

    it('should reset delayed execution', function () {
      const cancelSpy = sinon.spy($timeout, 'cancel');
      const bouncer = debounce(spy, 100);
      const bouncerFromProvider = debounceFromProvider(spy, 100);

      bouncer();
      sandbox.clock.tick(1);

      bouncer();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
      sinon.assert.calledOnce(cancelSpy);

      spy.resetHistory();
      cancelSpy.resetHistory();

      bouncerFromProvider();
      sandbox.clock.tick(1);

      bouncerFromProvider();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
      sinon.assert.calledOnce(cancelSpy);
    });
  });

  describe('cancel', function () {
    it('should cancel the $timeout', function () {
      const cancelSpy = sinon.spy($timeout, 'cancel');
      const bouncer = debounce(spy, 100);
      const bouncerFromProvider = debounceFromProvider(spy, 100);

      bouncer();
      bouncer.cancel();
      sinon.assert.calledOnce(cancelSpy);
      // throws if pending timeouts
      $timeout.verifyNoPendingTasks();

      cancelSpy.resetHistory();

      bouncerFromProvider();
      bouncerFromProvider.cancel();
      sinon.assert.calledOnce(cancelSpy);
      // throws if pending timeouts
      $timeout.verifyNoPendingTasks();
    });
  });
});

