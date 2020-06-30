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

import sinon, { SinonSpy } from 'sinon';
import angular, { auto, ITimeoutService } from 'angular';
import 'angular-mocks';
import 'angular-sanitize';
import 'angular-route';

// @ts-ignore
import { DebounceProvider } from './index';
import { coreMock } from '../../../../../../../core/public/mocks';
import { initializeInnerAngularModule } from '../../../../get_inner_angular';
import { navigationPluginMock } from '../../../../../../navigation/public/mocks';
import { dataPluginMock } from '../../../../../../data/public/mocks';
import { initAngularBootstrap } from '../../../../../../kibana_legacy/public';

describe('debounce service', function () {
  let debounce: (fn: () => void, timeout: number, options?: any) => any;
  let debounceFromProvider: (fn: () => void, timeout: number, options?: any) => any;
  let $timeout: ITimeoutService;
  let spy: SinonSpy;

  beforeEach(() => {
    spy = sinon.spy();

    initAngularBootstrap();

    initializeInnerAngularModule(
      'app/discover',
      coreMock.createStart(),
      navigationPluginMock.createStartContract(),
      dataPluginMock.createStartContract()
    );

    angular.mock.module('app/discover');

    angular.mock.inject(
      ($injector: auto.IInjectorService, _$timeout_: ITimeoutService, Private: any) => {
        $timeout = _$timeout_;

        debounce = $injector.get('debounce');
        debounceFromProvider = Private(DebounceProvider);
      }
    );
  });

  it('should have a cancel method', function () {
    const bouncer = debounce(() => {}, 100);
    const bouncerFromProvider = debounceFromProvider(() => {}, 100);

    expect(bouncer).toHaveProperty('cancel');
    expect(bouncerFromProvider).toHaveProperty('cancel');
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
      const bouncerFromProvider = debounceFromProvider(spy, 100, {
        leading: true,
        trailing: false,
      });

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
