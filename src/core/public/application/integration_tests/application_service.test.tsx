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

import { createRenderer } from './utils';
import { createMemoryHistory, MemoryHistory } from 'history';
import { ApplicationService } from '../application_service';
import { httpServiceMock } from '../../http/http_service.mock';
import { contextServiceMock } from '../../context/context_service.mock';
import { injectedMetadataServiceMock } from '../../injected_metadata/injected_metadata_service.mock';
import { MockLifecycle } from '../test_types';
import { overlayServiceMock } from '../../overlays/overlay_service.mock';
import { AppMountParameters } from '../types';

describe('ApplicationService', () => {
  let setupDeps: MockLifecycle<'setup'>;
  let startDeps: MockLifecycle<'start'>;
  let service: ApplicationService;
  let history: MemoryHistory<any>;
  let update: ReturnType<typeof createRenderer>;

  const navigate = (path: string) => {
    history.push(path);
    return update();
  };

  beforeEach(() => {
    history = createMemoryHistory();
    const http = httpServiceMock.createSetupContract({ basePath: '/test' });

    http.post.mockResolvedValue({ navLinks: {} });

    setupDeps = {
      http,
      context: contextServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
      history: history as any,
    };
    setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(false);
    startDeps = { http, overlays: overlayServiceMock.createStartContract() };
    service = new ApplicationService();
  });

  describe('leaving an application that registered an app leave handler', () => {
    it('navigates to the new app if action is default', async () => {
      startDeps.overlays.openConfirm.mockResolvedValue(true);

      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: ({ onAppLeave }: AppMountParameters) => {
          onAppLeave(actions => actions.default());
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: ({}: AppMountParameters) => {
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent } = await service.start(startDeps);

      update = createRenderer(getComponent());

      await navigate('/app/app1');
      await navigateToApp('app2');

      expect(startDeps.overlays.openConfirm).not.toHaveBeenCalled();
      expect(history.entries.length).toEqual(3);
      expect(history.entries[2].pathname).toEqual('/app/app2');
    });

    it('navigates to the new app if action is confirm and user accepted', async () => {
      startDeps.overlays.openConfirm.mockResolvedValue(true);

      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: ({ onAppLeave }: AppMountParameters) => {
          onAppLeave(actions => actions.confirm('confirmation-message', 'confirmation-title'));
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: ({}: AppMountParameters) => {
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent } = await service.start(startDeps);

      update = createRenderer(getComponent());

      await navigate('/app/app1');
      await navigateToApp('app2');

      expect(startDeps.overlays.openConfirm).toHaveBeenCalledTimes(1);
      expect(startDeps.overlays.openConfirm).toHaveBeenCalledWith(
        'confirmation-message',
        expect.objectContaining({ title: 'confirmation-title' })
      );
      expect(history.entries.length).toEqual(3);
      expect(history.entries[2].pathname).toEqual('/app/app2');
    });

    it('blocks navigation to the new app if action is confirm and user declined', async () => {
      startDeps.overlays.openConfirm.mockResolvedValue(false);

      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: ({ onAppLeave }: AppMountParameters) => {
          onAppLeave(actions => actions.confirm('confirmation-message', 'confirmation-title'));
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: ({}: AppMountParameters) => {
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent } = await service.start(startDeps);

      update = createRenderer(getComponent());

      await navigate('/app/app1');
      await navigateToApp('app2');

      expect(startDeps.overlays.openConfirm).toHaveBeenCalledTimes(1);
      expect(startDeps.overlays.openConfirm).toHaveBeenCalledWith(
        'confirmation-message',
        expect.objectContaining({ title: 'confirmation-title' })
      );
      expect(history.entries.length).toEqual(2);
      expect(history.entries[1].pathname).toEqual('/app/app1');
    });
  });
});
