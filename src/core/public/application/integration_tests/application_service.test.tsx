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

import { Subject } from 'rxjs';
import { bufferCount, skip, takeUntil } from 'rxjs/operators';

import { injectedMetadataServiceMock } from '../../injected_metadata/injected_metadata_service.mock';
import { contextServiceMock } from '../../context/context_service.mock';
import { httpServiceMock } from '../../http/http_service.mock';
import { MockLifecycle } from '../test_types';
import { ApplicationService } from '../application_service';
import { createRenderer } from './utils';

describe('#start()', () => {
  let setupDeps: MockLifecycle<'setup'>;
  let startDeps: MockLifecycle<'start'>;
  let service: ApplicationService;

  beforeEach(() => {
    setupDeps = {
      http: httpServiceMock.createSetupContract(),
      context: contextServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    };
    setupDeps.http.post.mockImplementation(async path => {
      if (path.startsWith('/api/core/capabilities')) {
        return {
          navLinks: {
            alpha: true,
            beta: false,
            gamma: true,
            delta: false,
          },
        };
      }
    });
    setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(false);
    startDeps = { http: setupDeps.http, injectedMetadata: setupDeps.injectedMetadata };
    service = new ApplicationService();
  });

  describe('navigateToApp', () => {
    it('updates currentApp$ after mounting', async () => {
      service.setup(setupDeps);

      const application = await service.start(startDeps);
      const stop$ = new Subject();
      const promise = application.currentAppId$
        .pipe(skip(1), bufferCount(4), takeUntil(stop$))
        .toPromise();
      const render = createRenderer(application.getComponent(), application.navigateToApp);

      await render('alpha');
      await render('beta');
      await render('gamma');
      await render('delta');
      stop$.next();

      const appIds = await promise;

      expect(appIds).toMatchInlineSnapshot(`
        Array [
          "alpha",
          "beta",
          "gamma",
          "delta",
        ]
      `);
    });

    it('sets window.location.href when navigating to legacy apps', async () => {
      setupDeps.http = httpServiceMock.createSetupContract({ basePath: '/test' });
      setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
      setupDeps.redirectTo = jest.fn();
      service.setup(setupDeps);

      const application = await service.start(startDeps);
      const render = createRenderer(application.getComponent(), application.navigateToApp);

      await render('alpha');
      expect(setupDeps.redirectTo).toHaveBeenCalledWith('/test/app/alpha');
    });

    it('handles legacy apps with subapps', async () => {
      setupDeps.http = httpServiceMock.createSetupContract({ basePath: '/test' });
      setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
      setupDeps.redirectTo = jest.fn();

      const { registerLegacyApp } = service.setup(setupDeps);

      registerLegacyApp({ id: 'baseApp:legacyApp1' } as any);

      const application = await service.start(startDeps);
      const render = createRenderer(application.getComponent(), application.navigateToApp);

      await render('baseApp:legacyApp1');
      expect(setupDeps.redirectTo).toHaveBeenCalledWith('/test/app/baseApp');
    });
  });
});
