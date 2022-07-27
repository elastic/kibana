/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AuthHeadersStorage } from './auth_headers_storage';
import { mockRouter } from '@kbn/core-http-router-server-mocks';

describe('AuthHeadersStorage', () => {
  describe('stores authorization headers', () => {
    it('retrieves a copy of headers associated with Kibana request', () => {
      const headers = { authorization: 'token' };
      const storage = new AuthHeadersStorage();
      const request = mockRouter.createKibanaRequest();
      storage.set(request, headers);
      expect(storage.get(request)).toEqual(headers);
    });
  });
});
