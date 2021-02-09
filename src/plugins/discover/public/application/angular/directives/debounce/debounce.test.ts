/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon, { SinonSpy } from 'sinon';
import angular, { auto, ITimeoutService } from 'angular';
import 'angular-mocks';
import 'angular-sanitize';
import 'angular-route';

// @ts-ignore
import { createDebounceProviderTimeout } from './debounce';
import { coreMock } from '../../../../../../../core/public/mocks';
import { initializeInnerAngularModule } from '../../../../get_inner_angular';
import { navigationPluginMock } from '../../../../../../navigation/public/mocks';
import { dataPluginMock } from '../../../../../../data/public/mocks';
import { initAngularBootstrap } from '../../../../../../kibana_legacy/public';

describe('debounce service', function () {
  let debounce: (fn: () => void, timeout: number, options?: any) => any;
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

    angular.mock.inject(($injector: auto.IInjectorService, _$timeout_: ITimeoutService) => {
      $timeout = _$timeout_;

      debounce = createDebounceProviderTimeout($timeout);
    });
  });

  it('should have a cancel method', function () {
    const bouncer = debounce(() => {}, 100);

    expect(bouncer).toHaveProperty('cancel');
  });

  describe('delayed execution', function () {
    const sandbox = sinon.createSandbox();

    beforeEach(() => sandbox.useFakeTimers());
    afterEach(() => sandbox.restore());

    it('should delay execution', function () {
      const bouncer = debounce(spy, 100);

      bouncer();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);

      spy.resetHistory();
    });

    it('should fire on leading edge', function () {
      const bouncer = debounce(spy, 100, { leading: true });

      bouncer();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledTwice(spy);

      spy.resetHistory();
    });

    it('should only fire on leading edge', function () {
      const bouncer = debounce(spy, 100, { leading: true, trailing: false });

      bouncer();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);

      spy.resetHistory();
    });

    it('should reset delayed execution', function () {
      const cancelSpy = sinon.spy($timeout, 'cancel');
      const bouncer = debounce(spy, 100);

      bouncer();
      sandbox.clock.tick(1);

      bouncer();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
      sinon.assert.calledOnce(cancelSpy);

      spy.resetHistory();
      cancelSpy.resetHistory();
    });
  });

  describe('cancel', function () {
    it('should cancel the $timeout', function () {
      const cancelSpy = sinon.spy($timeout, 'cancel');
      const bouncer = debounce(spy, 100);

      bouncer();
      bouncer.cancel();
      sinon.assert.calledOnce(cancelSpy);
      // throws if pending timeouts
      $timeout.verifyNoPendingTasks();

      cancelSpy.resetHistory();
    });
  });
});
