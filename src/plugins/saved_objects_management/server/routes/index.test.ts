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
    expect(router.get).toHaveBeenCalledTimes(4);
    expect(router.post).toHaveBeenCalledTimes(2);

    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/kibana/management/saved_objects/_find',
      }),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/kibana/management/saved_objects/{type}/{id}',
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
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/kibana/management/saved_objects/scroll/export',
      }),
      expect.any(Function)
    );
  });
});
