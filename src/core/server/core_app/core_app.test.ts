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

import { mockCoreContext } from '../core_context.mock';
import { coreMock } from '../mocks';
import { httpResourcesMock } from '../http_resources/http_resources_service.mock';
import { CoreApp } from './core_app';

describe('CoreApp', () => {
  let coreApp: CoreApp;
  let internalCoreSetup: ReturnType<typeof coreMock.createInternalSetup>;
  let httpResourcesRegistrar: ReturnType<typeof httpResourcesMock.createRegistrar>;

  beforeEach(() => {
    const coreContext = mockCoreContext.create();
    internalCoreSetup = coreMock.createInternalSetup();
    httpResourcesRegistrar = httpResourcesMock.createRegistrar();
    internalCoreSetup.httpResources.createRegistrar.mockReturnValue(httpResourcesRegistrar);
    coreApp = new CoreApp(coreContext);
  });

  describe('`/status` route', () => {
    it('is registered with `authRequired: false` is the status page is anonymous', () => {
      internalCoreSetup.status.isStatusPageAnonymous.mockReturnValue(true);
      coreApp.setup(internalCoreSetup);

      expect(httpResourcesRegistrar.register).toHaveBeenCalledWith(
        {
          path: '/status',
          validate: false,
          options: {
            authRequired: false,
          },
        },
        expect.any(Function)
      );
    });

    it('is registered with `authRequired: true` is the status page is not anonymous', () => {
      internalCoreSetup.status.isStatusPageAnonymous.mockReturnValue(false);
      coreApp.setup(internalCoreSetup);

      expect(httpResourcesRegistrar.register).toHaveBeenCalledWith(
        {
          path: '/status',
          validate: false,
          options: {
            authRequired: true,
          },
        },
        expect.any(Function)
      );
    });
  });
});
