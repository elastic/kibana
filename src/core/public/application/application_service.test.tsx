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

import { shallow } from 'enzyme';
import React from 'react';

import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { MockCapabilitiesService, MockHistory } from './application_service.test.mocks';
import { ApplicationService } from './application_service';
import { contextServiceMock } from '../context/context_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { take } from 'rxjs/operators';
import { BehaviorSubject, of } from 'rxjs';
import { AppStatus, AppStatusUpdater, InternalApplicationSetup } from './types';
import { ContextSetup, HttpSetup } from 'kibana/public';
import { InjectedMetadataSetup } from '../injected_metadata';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let context: jest.Mocked<ContextSetup>;
  let http: jest.Mocked<HttpSetup>;
  let injectedMetadata: jest.Mocked<InjectedMetadataSetup>;

  beforeEach(() => {
    service = new ApplicationService();
    context = contextServiceMock.createSetupContract();
    http = httpServiceMock.createStartContract();
    injectedMetadata = injectedMetadataServiceMock.createStartContract();
  });

  describe('#setup()', () => {
    describe('register', () => {
      it('throws an error if two apps with the same id are registered', () => {
        const setup = service.setup({ context });
        setup.register(Symbol(), { id: 'app1' } as any);
        expect(() =>
          setup.register(Symbol(), { id: 'app1' } as any)
        ).toThrowErrorMatchingInlineSnapshot(
          `"An application is already registered with the id \\"app1\\""`
        );
      });

      it('throws error if additional apps are registered after setup', async () => {
        const setup = service.setup({ context });
        await service.start({ http, injectedMetadata });
        expect(() =>
          setup.register(Symbol(), { id: 'app1' } as any)
        ).toThrowErrorMatchingInlineSnapshot(
          `"Applications cannot be registered after \\"setup\\""`
        );
      });
    });

    describe('registerLegacyApp', () => {
      it('throws an error if two apps with the same id are registered', () => {
        const setup = service.setup({ context });
        setup.registerLegacyApp({ id: 'app2' } as any);
        expect(() =>
          setup.registerLegacyApp({ id: 'app2' } as any)
        ).toThrowErrorMatchingInlineSnapshot(
          `"A legacy application is already registered with the id \\"app2\\""`
        );
      });

      it('throws error if additional apps are registered after setup', async () => {
        const setup = service.setup({ context });
        await service.start({ http, injectedMetadata });
        expect(() =>
          setup.registerLegacyApp({ id: 'app2' } as any)
        ).toThrowErrorMatchingInlineSnapshot(
          `"Applications cannot be registered after \\"setup\\""`
        );
      });
    });

    describe('registerAppStatusUpdater', () => {
      it('updates status fields', async () => {
        const setup = service.setup({ context });

        const pluginId = Symbol('plugin');
        setup.register(pluginId, { id: 'app1' } as any);
        setup.register(pluginId, { id: 'app2' } as any);
        setup.registerAppStatusUpdater(
          new BehaviorSubject<AppStatusUpdater>(app => {
            if (app.id === 'app1') {
              return {
                status: AppStatus.inaccessibleWithDisabledNavLink,
                tooltip: 'App inaccessible due to reason',
              };
            }
          })
        );

        const start = await service.start({ http, injectedMetadata });

        expect(await start.availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
          Map {
            "app1" => Object {
              "id": "app1",
              "legacy": false,
              "status": 1,
              "tooltip": "App inaccessible due to reason",
            },
            "app2" => Object {
              "id": "app2",
              "legacy": false,
              "status": 0,
            },
          }
        `);
      });

      it('excludes applications that are inaccessible', async () => {
        const setup = service.setup({ context });

        const pluginId = Symbol('plugin');
        setup.register(pluginId, { id: 'app1' } as any);
        setup.register(pluginId, { id: 'app2' } as any);
        setup.registerAppStatusUpdater(
          new BehaviorSubject<AppStatusUpdater>(app => {
            if (app.id === 'app1') {
              return {
                status: AppStatus.inaccessible,
              };
            }
          })
        );

        const start = await service.start({ http, injectedMetadata });

        expect(await start.availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
          Map {
            "app2" => Object {
              "id": "app2",
              "legacy": false,
              "status": 0,
            },
          }
        `);
      });

      it('applies the most restrictive status in case of multiple updaters', async () => {
        const setup = service.setup({ context });

        const pluginId = Symbol('plugin');
        setup.register(pluginId, { id: 'app1' } as any);
        setup.registerAppStatusUpdater(
          new BehaviorSubject<AppStatusUpdater>(app => {
            return {
              status: AppStatus.inaccessibleWithDisabledNavLink,
            };
          })
        );
        setup.registerAppStatusUpdater(
          new BehaviorSubject<AppStatusUpdater>(app => {
            return {
              status: AppStatus.accessible,
            };
          })
        );

        const start = await service.start({ http, injectedMetadata });

        expect(await start.availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
          Map {
            "app1" => Object {
              "id": "app1",
              "legacy": false,
              "status": 1,
            },
          }
        `);
      });

      it('emits on availableApps$ when a status updater changes', async () => {
        const setup = service.setup({ context });

        const pluginId = Symbol('plugin');
        setup.register(pluginId, { id: 'app1' } as any);

        const statusUpdater = new BehaviorSubject<AppStatusUpdater>(app => {
          return {
            status: AppStatus.inaccessibleWithDisabledNavLink,
          };
        });
        setup.registerAppStatusUpdater(statusUpdater);

        const start = await service.start({ http, injectedMetadata });

        let latestValue = null;

        start.availableApps$.subscribe(apps => {
          latestValue = apps;
        });

        expect(latestValue).toMatchInlineSnapshot(`
          Map {
            "app1" => Object {
              "id": "app1",
              "legacy": false,
              "status": 1,
            },
          }
        `);

        statusUpdater.next(app => {
          return {
            status: AppStatus.accessible,
          };
        });

        expect(latestValue).toMatchInlineSnapshot(`
          Map {
            "app1" => Object {
              "id": "app1",
              "legacy": false,
              "status": 0,
            },
          }
        `);
      });

      it('also updates legacy apps', async () => {
        const setup = service.setup({ context });

        setup.registerLegacyApp({ id: 'app1' } as any);

        setup.registerAppStatusUpdater(
          new BehaviorSubject<AppStatusUpdater>(app => {
            return {
              status: AppStatus.inaccessibleWithDisabledNavLink,
              tooltip: 'App inaccessible due to reason',
            };
          })
        );

        const start = await service.start({ http, injectedMetadata });

        expect(await start.availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
          Map {
            "app1" => Object {
              "id": "app1",
              "legacy": true,
              "status": 1,
              "tooltip": "App inaccessible due to reason",
            },
          }
        `);
      });
    });

    it("`registerMountContext` calls context container's registerContext", () => {
      const setup = service.setup({ context });
      const container = context.createContextContainer.mock.results[0].value;
      const pluginId = Symbol();
      const noop = () => {};
      setup.registerMountContext(pluginId, 'test' as any, noop as any);
      expect(container.registerContext).toHaveBeenCalledWith(pluginId, 'test', noop);
    });
  });

  describe('#start()', () => {
    beforeEach(() => {
      MockHistory.push.mockReset();
    });

    it('exposes available apps from capabilities', async () => {
      const setup = service.setup({ context });
      setup.register(Symbol(), { id: 'app1' } as any);
      setup.registerLegacyApp({ id: 'app2' } as any);

      const startContract = await service.start({ http, injectedMetadata });

      await expect(startContract.availableApps$.pipe(take(1)).toPromise()).resolves
        .toMatchInlineSnapshot(`
              Map {
                "app1" => Object {
                  "id": "app1",
                  "legacy": false,
                  "status": 0,
                },
                "app2" => Object {
                  "id": "app2",
                  "legacy": true,
                  "status": 0,
                },
              }
            `);
    });

    it('passes registered applications to capabilities', async () => {
      const setup = service.setup({ context });
      setup.register(Symbol(), { id: 'app1' } as any);

      await service.start({ http, injectedMetadata });

      expect(MockCapabilitiesService.start).toHaveBeenCalledWith({
        apps: new Map([['app1', { id: 'app1', legacy: false, status: AppStatus.accessible }]]),
        injectedMetadata,
      });
    });

    it('passes registered legacy applications to capabilities', async () => {
      const setup = service.setup({ context });
      setup.registerLegacyApp({ id: 'legacyApp1' } as any);

      await service.start({ http, injectedMetadata });

      expect(MockCapabilitiesService.start).toHaveBeenCalledWith({
        apps: new Map([
          ['legacyApp1', { id: 'legacyApp1', legacy: true, status: AppStatus.accessible }],
        ]),
        injectedMetadata,
      });
    });

    it('returns renderable JSX tree', async () => {
      service.setup({ context });

      injectedMetadata.getLegacyMode.mockReturnValue(false);
      const start = await service.start({ http, injectedMetadata });

      expect(() => shallow(React.createElement(() => start.getComponent()))).not.toThrow();
    });

    describe('navigateToApp', () => {
      let setup: InternalApplicationSetup;

      beforeEach(() => {
        setup = service.setup({ context });
        setup.register(Symbol(), { id: 'myTestApp' } as any);
        setup.register(Symbol(), { id: 'myOtherApp' } as any);
      });

      it('changes the browser history to /app/:appId', async () => {
        injectedMetadata.getLegacyMode.mockReturnValue(false);
        const start = await service.start({ http, injectedMetadata });

        start.navigateToApp('myTestApp');
        expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', undefined);
        start.navigateToApp('myOtherApp');
        expect(MockHistory.push).toHaveBeenCalledWith('/app/myOtherApp', undefined);
      });

      it('appends a path if specified', async () => {
        injectedMetadata.getLegacyMode.mockReturnValue(false);
        const start = await service.start({ http, injectedMetadata });

        start.navigateToApp('myTestApp', { path: 'deep/link/to/location/2' });
        expect(MockHistory.push).toHaveBeenCalledWith(
          '/app/myTestApp/deep/link/to/location/2',
          undefined
        );
      });

      it('includes state if specified', async () => {
        injectedMetadata.getLegacyMode.mockReturnValue(false);
        const start = await service.start({ http, injectedMetadata });

        start.navigateToApp('myTestApp', { state: 'my-state' });
        expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', 'my-state');
      });

      it('redirects when in legacyMode', async () => {
        injectedMetadata.getLegacyMode.mockReturnValue(true);
        const redirectTo = jest.fn();
        const start = await service.start({ http, injectedMetadata, redirectTo });
        start.navigateToApp('myTestApp');
        expect(redirectTo).toHaveBeenCalledWith('/app/myTestApp');
      });

      it('throws if application is unknown', async () => {
        injectedMetadata.getLegacyMode.mockReturnValue(false);
        const start = await service.start({ http, injectedMetadata });

        expect(() => {
          start.navigateToApp('unknownApp');
        }).toThrowErrorMatchingInlineSnapshot(
          `"Trying to navigate to an unknown application: unknownApp"`
        );
      });

      //
      it('throws if application is inaccessible', async () => {
        setup.registerAppStatusUpdater(
          of(app => {
            if (app.id === 'myTestApp') {
              return {
                status: AppStatus.inaccessible,
              };
            }
            if (app.id === 'myOtherApp') {
              return {
                status: AppStatus.inaccessibleWithDisabledNavLink,
              };
            }
          })
        );

        injectedMetadata.getLegacyMode.mockReturnValue(false);
        const start = await service.start({ http, injectedMetadata });

        expect(() => {
          start.navigateToApp('myTestApp');
        }).toThrowErrorMatchingInlineSnapshot(
          `"Trying to navigate to an inaccessible application: myTestApp"`
        );
        expect(() => {
          start.navigateToApp('myOtherApp');
        }).toThrowErrorMatchingInlineSnapshot(
          `"Trying to navigate to an inaccessible application: myOtherApp"`
        );
      });
    });
  });
});
