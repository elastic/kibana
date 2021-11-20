/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerRoutes } from './index';
import { ISavedObjectsManagement } from '../services';
import { coreMock, httpServiceMock } from '../../../../core/server/mocks';

describe('registerRoutes', () => {
  it('registers the management routes', () => {
    const router = httpServiceMock.createRouter();
    const httpSetup = coreMock.createSetup().http;
    httpSetup.createRouter.mockReturnValue(router);
    const managementPromise = Promise.resolve({} as ISavedObjectsManagement);

    registerRoutes({
      http: httpSetup,
      managementServicePromise: managementPromise,
    });

    expect(httpSetup.createRouter).toHaveBeenCalledTimes(1);
    expect(router.get).toHaveBeenCalledTimes(3);
    expect(router.post).toHaveBeenCalledTimes(2);

    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/kibana/management/saved_objects/_find',
      }),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/kibana/management/saved_objects/_bulk_get',
      }),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/kibana/management/saved_objects/relationships/{type}/{id}',
      }),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/kibana/management/saved_objects/_allowed_types',
      }),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/kibana/management/saved_objects/scroll/counts',
      }),
      expect.any(Function)
    );
  });
});
