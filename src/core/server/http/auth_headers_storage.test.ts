/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AuthHeadersStorage } from './auth_headers_storage';
import { KibanaRequest } from './router';
import { httpServerMock } from './http_server.mocks';
describe('AuthHeadersStorage', () => {
  describe('stores authorization headers', () => {
    it('retrieves a copy of headers associated with Kibana request', () => {
      const headers = { authorization: 'token' };
      const storage = new AuthHeadersStorage();
      const rawRequest = httpServerMock.createRawRequest();
      storage.set(KibanaRequest.from(rawRequest), headers);
      expect(storage.get(KibanaRequest.from(rawRequest))).toEqual(headers);
    });

    it('retrieves a copy of headers associated with Legacy.Request', () => {
      const headers = { authorization: 'token' };
      const storage = new AuthHeadersStorage();
      const rawRequest = httpServerMock.createRawRequest();
      storage.set(rawRequest, headers);
      expect(storage.get(rawRequest)).toEqual(headers);
    });

    it('retrieves a copy of headers associated with both KibanaRequest & Legacy.Request', () => {
      const headers = { authorization: 'token' };
      const storage = new AuthHeadersStorage();
      const rawRequest = httpServerMock.createRawRequest();

      storage.set(KibanaRequest.from(rawRequest), headers);
      expect(storage.get(rawRequest)).toEqual(headers);
    });
  });
});
