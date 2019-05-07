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
import KbnServer from '../kbn_server';
import { mockRegisterCapabilitiesRoute } from './capabilities_mixin.test.mocks';

import { capabilitiesMixin } from './capabilities_mixin';

describe('capabilitiesMixin', () => {
  const getKbnServer = (pluginSpecs: any[] = []) => {
    return {
      afterPluginsInit: (callback: () => void) => callback(),
      pluginSpecs,
    } as KbnServer;
  };

  let server: Server;
  beforeEach(() => {
    server = new Server();
  });

  afterEach(() => {
    mockRegisterCapabilitiesRoute.mockClear();
  });

  it('calls registerCapabilitiesRoute with merged uiCapabilitiesProviers', async () => {
    const kbnServer = getKbnServer([
      {
        getUiCapabilitiesProvider: () => () => ({
          app1: { read: true },
          management: { section1: { feature1: true } },
        }),
      },
      {
        getUiCapabilitiesProvider: () => () => ({
          app2: { write: true },
          catalogue: { feature3: true },
          management: { section2: { feature2: true } },
        }),
      },
    ]);

    await capabilitiesMixin(kbnServer, server);

    expect(mockRegisterCapabilitiesRoute).toHaveBeenCalledWith(
      server,
      {
        app1: { read: true },
        app2: { write: true },
        catalogue: { feature3: true },
        management: {
          section1: { feature1: true },
          section2: { feature2: true },
        },
        navLinks: {},
      },
      []
    );
  });

  it('exposes server#registerCapabilitiesModifier for providing modifiers to the route', async () => {
    const kbnServer = getKbnServer();
    await capabilitiesMixin(kbnServer, server);
    const mockModifier1 = jest.fn();
    const mockModifier2 = jest.fn();
    server.registerCapabilitiesModifier(mockModifier1);
    server.registerCapabilitiesModifier(mockModifier2);

    expect(mockRegisterCapabilitiesRoute.mock.calls[0][2]).toEqual([mockModifier1, mockModifier2]);
  });
});
