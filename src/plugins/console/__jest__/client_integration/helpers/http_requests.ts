/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon, { SinonFakeServer } from 'sinon';

const API_BASE_PATH = 'api/console';

export interface ResponseError {
  statusCode: number;
  message: string | Error;
}

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setLoadEsConfigResponse = (response?: any, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/console/es_config`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  return {
    setLoadEsConfigResponse,
  };
};

export const init = () => {
  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // Define default response for unhandled requests.
  // We make requests to APIs which don't impact the component under test, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, 'DefaultMockedResponse']);

  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(server);

  return {
    server,
    httpRequestsMockHelpers,
  };
};
