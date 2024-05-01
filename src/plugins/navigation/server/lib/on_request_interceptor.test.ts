/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OnPreRoutingHandler } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { initSolutionOnRequestInterceptor } from './on_request_interceptor';

const setup = () => {
  const { http } = coreMock.createSetup();
  const request = httpServerMock.createKibanaRequest();
  const response = httpServerMock.createLifecycleResponseFactory();
  const toolkit = httpServerMock.createToolkit();

  return {
    http,
    request,
    response,
    toolkit,
  };
};

const initAndRetrieveHandler = ({
  isEnabledInGlobalSettings = true,
}: { isEnabledInGlobalSettings?: boolean } = {}) => {
  const { http, request, response, toolkit } = setup();

  let handler: OnPreRoutingHandler | undefined;
  http.registerOnPreRouting.mockImplementation((_handler) => {
    handler = _handler;
  });

  initSolutionOnRequestInterceptor({
    http,
    defaultSolution: 'es',
    getIsEnabledInGlobalSettings: () => Promise.resolve(isEnabledInGlobalSettings),
  });

  if (!handler) {
    throw new Error('Pre routing handler has not been set');
  }

  return { handler, request, response, toolkit, http };
};

describe('initSolutionOnRequestInterceptor()', () => {
  test('sould register preRouting handler', () => {
    const { http } = setup();
    expect(http.registerOnPreRouting).not.toHaveBeenCalled();
    initSolutionOnRequestInterceptor({
      http,
      defaultSolution: 'es',
      getIsEnabledInGlobalSettings: jest.fn(),
    });
    expect(http.registerOnPreRouting).toHaveBeenCalled();
  });

  test('sould detect solutionId in path and set the basePath', async () => {
    const { handler, request, response, toolkit, http } = initAndRetrieveHandler();
    request.url.pathname = '/n/oblt/app/discover';

    await handler(request, response, toolkit);

    // base path has been set
    expect(http.basePath.set).toHaveBeenCalledWith(request, {
      basePath: '/n/oblt',
      id: 'solutions',
      index: 0,
    });

    // solutionId base path has been stripped (/n/oblt)
    expect(toolkit.rewriteUrl).toHaveBeenCalledWith('/app/discover');
    expect(toolkit.next).not.toHaveBeenCalled();
  });

  test('sould redirect if requesting app with no solutionId basePath or on space selector', async () => {
    const { handler, request, response, toolkit, http } = initAndRetrieveHandler();

    // Calling an app path (discover) or the space selector **without** solutionId in the path
    for (const pathname of ['/app/discover', '/spaces/space_selector']) {
      request.url.pathname = pathname;

      await handler(request, response, toolkit);

      // base path has been set
      expect(http.basePath.set).toHaveBeenCalledWith(request, {
        basePath: '/n/es', // "es" is the defaultSolution passed in setup() above
        id: 'solutions',
        index: 0,
      });

      expect(response.redirected).toHaveBeenCalledWith({
        headers: { location: `/mock-server-basepath/n/es${pathname}` }, // defaultSolution "es" has been added
      });
      expect(toolkit.rewriteUrl).not.toHaveBeenCalled();
      expect(toolkit.next).not.toHaveBeenCalled();

      response.redirected.mockReset();
    }
  });

  test('sould strip the solutionId if disabled in global settings and requesting app or on space selector', async () => {
    const { handler, request, response, toolkit, http } = initAndRetrieveHandler({
      isEnabledInGlobalSettings: false, // Solution nav is disabled in global settings
    });

    // Calling an app path (discover) or the space selector **with** solutionId in the path
    for (const [pathname, expected] of [
      ['/n/es/app/discover', '/app/discover'],
      ['/n/es/spaces/space_selector', '/spaces/space_selector'],
    ]) {
      request.url.pathname = pathname;

      await handler(request, response, toolkit);

      expect(http.basePath.set).not.toHaveBeenCalled();

      expect(response.redirected).toHaveBeenCalledWith({
        headers: { location: `/mock-server-basepath${expected}` }, // solutionId has been stripped
      });
      expect(toolkit.rewriteUrl).not.toHaveBeenCalled();
      expect(toolkit.next).not.toHaveBeenCalled();

      response.redirected.mockReset();
    }
  });

  test(`if no solutionId in path and not targetting an app or spaceselector, don't do anything`, async () => {
    const { handler, request, response, toolkit, http } = initAndRetrieveHandler();

    request.url.pathname = 'bootstrap.js';

    await handler(request, response, toolkit);

    expect(toolkit.next).toHaveBeenCalled(); // Calling next on the pre hook

    expect(http.basePath.set).not.toHaveBeenCalled();
    expect(response.redirected).not.toHaveBeenCalled();
    expect(toolkit.rewriteUrl).not.toHaveBeenCalled();
  });
});
