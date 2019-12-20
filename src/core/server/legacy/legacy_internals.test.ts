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

import { Server } from 'hapi';

import { configMock } from '../config/config.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { httpServerMock } from '../http/http_server.mocks';
import { findLegacyPluginSpecsMock } from './legacy_service.test.mocks';
import { LegacyInternals } from './legacy_internals';
import { LegacyPlugins, LegacyConfig, Vars } from './types';

function varsProvider(vars: Vars, configValue?: any) {
  return {
    fn: jest.fn().mockReturnValue(vars),
    pluginSpec: {
      readConfigValue: jest.fn().mockReturnValue(configValue),
    },
  };
}

describe('LegacyInternals', () => {
  describe('getInjectedUiAppVars()', () => {
    let legacyPlugins: LegacyPlugins;
    let config: LegacyConfig;
    let server: Server;
    let legacyInternals: LegacyInternals;

    beforeEach(async () => {
      legacyPlugins = findLegacyPluginSpecsMock();
      config = configMock.create() as any;
      server = httpServiceMock.createSetupContract().server;
      legacyInternals = new LegacyInternals(legacyPlugins, config, server);
    });

    it('gets with no injectors', async () => {
      await expect(legacyInternals.getInjectedUiAppVars('core')).resolves.toMatchInlineSnapshot(
        `Object {}`
      );
    });

    it('gets with no matching injectors', async () => {
      const injector = jest.fn().mockResolvedValue({ not: 'core' });
      legacyInternals.injectUiAppVars('not-core', injector);

      await expect(legacyInternals.getInjectedUiAppVars('core')).resolves.toMatchInlineSnapshot(
        `Object {}`
      );
      expect(injector).not.toHaveBeenCalled();
    });

    it('gets with single matching injector', async () => {
      const injector = jest.fn().mockResolvedValue({ is: 'core' });
      legacyInternals.injectUiAppVars('core', injector);

      await expect(legacyInternals.getInjectedUiAppVars('core')).resolves.toMatchInlineSnapshot(`
        Object {
          "is": "core",
        }
      `);
      expect(injector).toHaveBeenCalled();
      expect(injector).toHaveBeenCalledWith(server);
    });

    it('gets with multiple matching injectors', async () => {
      const injectors = [
        jest.fn().mockResolvedValue({ is: 'core' }),
        jest.fn().mockReturnValue({ sync: 'injector' }),
        jest.fn().mockResolvedValue({ is: 'merged-core' }),
      ];

      injectors.forEach(injector => legacyInternals.injectUiAppVars('core', injector));

      await expect(legacyInternals.getInjectedUiAppVars('core')).resolves.toMatchInlineSnapshot(`
        Object {
          "is": "merged-core",
          "sync": "injector",
        }
      `);
      expect(injectors[0]).toHaveBeenCalled();
      expect(injectors[1]).toHaveBeenCalled();
      expect(injectors[2]).toHaveBeenCalled();
    });
  });

  describe('getVars()', () => {
    let legacyPlugins: LegacyPlugins;
    let config: LegacyConfig;
    let server: Server;
    let legacyInternals: LegacyInternals;

    beforeEach(async () => {
      legacyPlugins = findLegacyPluginSpecsMock();
      config = configMock.create() as any;
      server = httpServiceMock.createSetupContract().server;
      legacyInternals = new LegacyInternals(legacyPlugins, config, server);
    });

    it('gets: no default injectors, no injected vars replacers, no ui app injectors, no inject arg', async () => {
      const vars = await legacyInternals.getVars('core', httpServerMock.createRawRequest());

      expect(vars).toMatchInlineSnapshot(`Object {}`);
    });

    it('gets: with default injectors, no injected vars replacers, no ui app injectors, no inject arg', async () => {
      legacyPlugins.uiExports.defaultInjectedVarProviders = [
        varsProvider({ alpha: 'alpha' }),
        varsProvider({ gamma: 'gamma' }),
        varsProvider({ alpha: 'beta' }),
      ];

      const vars = await legacyInternals.getVars('core', httpServerMock.createRawRequest());

      expect(vars).toMatchInlineSnapshot(`
        Object {
          "alpha": "beta",
          "gamma": "gamma",
        }
      `);
    });

    it('gets: no default injectors, with injected vars replacers, with ui app injectors, no inject arg', async () => {
      legacyPlugins.uiExports.injectedVarsReplacers = [
        jest.fn(async vars => ({ ...vars, added: 'key' })),
        jest.fn(vars => vars),
        jest.fn(vars => ({ replaced: 'all' })),
        jest.fn(async vars => ({ ...vars, added: 'last-key' })),
      ];

      const request = httpServerMock.createRawRequest();
      const vars = await legacyInternals.getVars('core', request);

      expect(vars).toMatchInlineSnapshot(`
        Object {
          "added": "last-key",
          "replaced": "all",
        }
      `);
    });

    it('gets: no default injectors, no injected vars replacers, with ui app injectors, no inject arg', async () => {
      legacyInternals.injectUiAppVars('core', async () => ({ is: 'core' }));
      legacyInternals.injectUiAppVars('core', () => ({ sync: 'injector' }));
      legacyInternals.injectUiAppVars('core', async () => ({ is: 'merged-core' }));

      const vars = await legacyInternals.getVars('core', httpServerMock.createRawRequest());

      expect(vars).toMatchInlineSnapshot(`
        Object {
          "is": "merged-core",
          "sync": "injector",
        }
      `);
    });

    it('gets: no default injectors, no injected vars replacers, no ui app injectors, with inject arg', async () => {
      const vars = await legacyInternals.getVars('core', httpServerMock.createRawRequest(), {
        injected: 'arg',
      });

      expect(vars).toMatchInlineSnapshot(`
        Object {
          "injected": "arg",
        }
      `);
    });

    it('gets: with default injectors, with injected vars replacers, with ui app injectors, with inject arg', async () => {
      legacyPlugins.uiExports.defaultInjectedVarProviders = [
        varsProvider({ alpha: 'alpha' }),
        varsProvider({ gamma: 'gamma' }),
        varsProvider({ alpha: 'beta' }),
      ];
      legacyPlugins.uiExports.injectedVarsReplacers = [
        jest.fn(async vars => ({ ...vars, gamma: 'delta' })),
      ];

      legacyInternals.injectUiAppVars('core', async () => ({ is: 'core' }));
      legacyInternals.injectUiAppVars('core', () => ({ sync: 'injector' }));
      legacyInternals.injectUiAppVars('core', async () => ({ is: 'merged-core' }));

      const vars = await legacyInternals.getVars('core', httpServerMock.createRawRequest(), {
        injected: 'arg',
        sync: 'arg',
      });

      expect(vars).toMatchInlineSnapshot(`
        Object {
          "alpha": "beta",
          "gamma": "delta",
          "injected": "arg",
          "is": "merged-core",
          "sync": "arg",
        }
      `);
    });
  });
});
