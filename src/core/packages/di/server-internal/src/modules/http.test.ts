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
import { CoreSetup, CoreStart, Request, Response, Route, Router } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { CoreSetup as TCoreSetup } from '@kbn/core-lifecycle-server';
import { http as httpModule } from './http';

@injectable()
class TestRoute {
  static method = 'post' as const;
  static path = '/some-path';
  static validate = {};
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out from authorization.',
    },
  } as const;

  constructor(
    @inject(Request) public readonly request: unknown,
    @inject(Response) public readonly response: KibanaResponseFactory
  ) {}

  handle() {
    return this.response.ok();
  }
}

describe('http', () => {
  let injection: jest.Mocked<ReturnType<typeof injectionServiceMock.createStartContract>>;
  let container: Container;
  let http: jest.Mocked<TCoreSetup['http']>;
  let router: jest.Mocked<ReturnType<typeof http.createRouter>>;

  function setup() {
    container.get(OnSetup)(container);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    injection = injectionServiceMock.createStartContract();
    router = { post: jest.fn() } as unknown as typeof router;
    http = { createRouter: jest.fn().mockReturnValue(router) } as unknown as typeof http;
    container = injection.getContainer();
    container.loadSync(httpModule);
    container.bind(CoreSetup('http')).toConstantValue(http);
    container.bind(CoreStart('injection')).toConstantValue(injection);
    container.bind(TestRoute).toSelf().inRequestScope();
    container.bind(Route).toConstantValue(TestRoute);
  });

  it('should create a router instance', () => {
    expect(container.isBound(Router)).toBe(true);
    expect(container.get(Router)).toBe(router);
    expect(http.createRouter).toHaveBeenCalled();
  });

  it('should create a router instance only once', () => {
    const fork = injection.fork();

    expect(fork.get(Router)).toBe(router);
    expect(fork.get(Router)).toBe(router);
    expect(http.createRouter).toHaveBeenCalledTimes(1);
  });

  it('should register a route', () => {
    container.bind(Route).toConstantValue(TestRoute);
    setup();

    expect(router.post).toHaveBeenCalledWith(TestRoute, expect.any(Function));
  });

  it('should not register a route if there are no corresponding bindings ', () => {
    container.unbindSync(Route);

    expect(setup).not.toThrow();
    expect(router.post).not.toHaveBeenCalled();
  });

  it('should handle a request', async () => {
    setup();

    const handleSpy = jest.spyOn(TestRoute.prototype, 'handle');
    expect(router.post).toHaveBeenCalledWith(TestRoute, expect.any(Function));
    const [, handler] = router.post.mock.lastCall!;
    const request = {} as unknown as KibanaRequest;
    const response = {
      ok: jest.fn(() => 'something'),
    } as unknown as jest.Mocked<KibanaResponseFactory>;
    const fork = injection.fork();
    const unbindAllSpy = jest.spyOn(fork, 'unbindAll');

    await expect(handler({} as any, request, response)).resolves.toBe('something');
    expect(response.ok).toHaveBeenCalled();

    const route = handleSpy.mock.contexts[0] as TestRoute;

    expect(route.request).toBe(request);
    expect(route.response).toBe(response);
    expect(unbindAllSpy).toHaveBeenCalled();
  });
});
