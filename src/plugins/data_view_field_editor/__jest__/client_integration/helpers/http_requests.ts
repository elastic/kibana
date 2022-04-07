/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { API_BASE_PATH } from '../../../common/constants';

type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';

type HttpResponse = Record<string, any> | any[];

const registerHttpRequestMockHelpers = (
  httpSetup: ReturnType<typeof httpServiceMock.createStartContract>,
  shouldDelayResponse: () => boolean
) => {
  const mockResponses = new Map<HttpMethod, Map<string, Promise<unknown>>>(
    ['GET', 'PUT', 'DELETE', 'POST'].map(
      (method) => [method, new Map()] as [HttpMethod, Map<string, Promise<unknown>>]
    )
  );

  /*
  const mockMethodImplementation = (method: HttpMethod, path: string) => {
    const responsePromise = mockResponses.get(method)?.get(path) ?? Promise.resolve({});
    if (shouldDelayResponse()) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(responsePromise), 1000);
      });
    }
    return responsePromise;
  };
  */

  const setFieldPreviewResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.body.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    console.log('settingFieldPreviewResponse');
    httpSetup.post.mockImplementation(() => {
      console.log('calling mocked post');
      return Promise.resolve([status, { 'Content-Type': 'application/json' }, body]);
    });
  };
  return {
    setFieldPreviewResponse,
  };
};

// Register helpers to mock HTTP Requests
/*
const registerHttpRequestMockHelpers = (
  httpSetup: ReturnType<typeof httpServiceMock.createStartContract>,
  shouldDelayResponse: () => boolean
) => {
  const setFieldPreviewResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.body.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('POST', `${API_BASE_PATH}/field_preview`, [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  return {
    setFieldPreviewResponse,
  };
};
*/

export const init = () => {
  /*
  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // Define default response for unhandled requests.
  // We make requests to APIs which don't impact the component under test, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, 'DefaultSinonMockServerResponse']);

  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(server);
  */

  let isResponseDelayed = false;
  const getDelayResponse = () => isResponseDelayed;
  const setDelayResponse = (shouldDelayResponse: boolean) => {
    isResponseDelayed = shouldDelayResponse;
  };

  const httpSetup = httpServiceMock.createSetupContract();
  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(httpSetup, getDelayResponse);

  return {
    httpSetup,
    setDelayResponse,
    httpRequestsMockHelpers,
  };
};
