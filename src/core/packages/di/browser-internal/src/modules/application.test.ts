/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, inject, injectable } from 'inversify';
import { OnSetup } from '@kbn/core-di';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreSetup, CoreStart, Application, ApplicationParameters } from '@kbn/core-di-browser';
import type { App, AppMountParameters, AppUnmount } from '@kbn/core-application-browser';
import type { CoreSetup as TCoreSetup } from '@kbn/core-lifecycle-browser';
import { application as applicationModule } from './application';

@injectable()
export class TestApplication {
  public static id = 'test';
  public static title = 'Test';
  public static visibleIn = [];

  constructor(@inject(ApplicationParameters) public readonly params: AppMountParameters) {}

  mount() {
    return () => this.unmount();
  }

  unmount() {}
}

describe('application', () => {
  let injection: jest.Mocked<ReturnType<typeof injectionServiceMock.createStartContract>>;
  let container: Container;
  let application: jest.Mocked<TCoreSetup['application']>;

  function setup() {
    container.get(OnSetup)(container);
  }

  beforeEach(() => {
    injection = injectionServiceMock.createStartContract();
    application = { register: jest.fn() } as unknown as typeof application;
    container = injection.getContainer();

    container.loadSync(applicationModule);
    container.bind(CoreSetup('application')).toConstantValue(application);
    container.bind(CoreStart('injection')).toConstantValue(injection);
    container.bind(TestApplication).toSelf().inRequestScope();
    container.bind(Application).toConstantValue(TestApplication);
  });

  describe('OnSetup', () => {
    it('should register an application', () => {
      setup();

      expect(application.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: TestApplication.id,
          title: TestApplication.title,
          visibleIn: TestApplication.visibleIn,
          mount: expect.any(Function),
        })
      );
    });

    it('should not register an application if there are no corresponding bindings', () => {
      container.unbindSync(Application);

      expect(setup).not.toThrow();
      expect(application.register).not.toHaveBeenCalled();
    });
  });

  describe('Application', () => {
    let fork: ReturnType<typeof injection.fork>;
    let mount: App['mount'];
    let mountSpy: jest.SpyInstance;
    let unmountSpy: jest.SpyInstance;
    let unbindAllSpy: jest.SpyInstance;
    let params: AppMountParameters;

    beforeEach(() => {
      fork = injection.fork();
      params = {} as unknown as AppMountParameters;

      mountSpy = jest.spyOn(TestApplication.prototype, 'mount');
      unmountSpy = jest.spyOn(TestApplication.prototype, 'unmount');
      unbindAllSpy = jest.spyOn(fork, 'unbindAll');

      setup();
      [{ mount }] = application.register.mock.lastCall!;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should mount an application', async () => {
      const unmount = mount(params);
      expect(unmount).toBeInstanceOf(Function);
      expect(mountSpy).toHaveBeenCalled();

      const [testApplication] = mountSpy.mock.contexts as TestApplication[];
      expect(testApplication.params).toBe(params);
      expect(unmountSpy).not.toHaveBeenCalled();
      expect(unbindAllSpy).not.toHaveBeenCalled();
    });

    it('should unmount an application', () => {
      const unmount = mount(params);
      (unmount as Function)();

      expect(unmountSpy).toHaveBeenCalled();
      expect(unbindAllSpy).toHaveBeenCalled();
    });

    it('should unbind all dependencies when unmount throws', () => {
      const unmount = mount(params);
      unmountSpy.mockImplementation(() => {
        throw new Error('Unmount error');
      });

      expect(() => (unmount as Function)()).toThrow('Unmount error');
      expect(unbindAllSpy).toHaveBeenCalled();
    });

    it('should unbind all dependencies when unmount is a promise', async () => {
      let resolveHandle: () => void;
      mountSpy.mockImplementation(function (this: TestApplication) {
        return new Promise<AppUnmount>((resolve) => {
          resolveHandle = () => resolve(() => this.unmount());
        });
      });
      const unmount = mount(params);

      expect(unbindAllSpy).not.toHaveBeenCalled();
      resolveHandle!();
      await expect(unmount as Promise<AppUnmount>).resolves.toBeInstanceOf(Function);
      (await unmount)();
      expect(unbindAllSpy).toHaveBeenCalled();
    });
  });
});
