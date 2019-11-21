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
import { registerCapabilitiesRoute } from './capabilities_route';
import { Capabilities } from '../../../core/public';

describe('capabilities api', () => {
  const defaultCapabilities = {
    catalogue: {
      feature1: true,
      feature2: true,
    },
    management: {
      section1: {
        read: true,
      },
      section2: {
        write: true,
      },
    },
    navLinks: {
      app1: true,
      app2: true,
    },
    myApp: {
      read: true,
      write: true,
      kioskMode: true,
    },
  } as Capabilities;

  let server: Server;

  beforeEach(() => {
    server = new Server();
  });

  it('returns unmodified uiCapabilities if no modifiers are available', async () => {
    registerCapabilitiesRoute(server, defaultCapabilities, []);
    const resp = await server.inject({
      method: 'POST',
      url: '/api/capabilities',
      payload: { capabilities: {} },
    });
    expect(JSON.parse(resp.payload)).toEqual({
      capabilities: defaultCapabilities,
    });
  });

  it('merges payload capabilities with defaultCapabilities', async () => {
    registerCapabilitiesRoute(server, defaultCapabilities, []);
    const resp = await server.inject({
      method: 'POST',
      url: '/api/capabilities',
      payload: { capabilities: { navLinks: { app3: true } } },
    });
    expect(JSON.parse(resp.payload)).toEqual({
      capabilities: {
        ...defaultCapabilities,
        navLinks: {
          ...defaultCapabilities.navLinks,
          app3: true,
        },
      },
    });
  });

  it('allows a single provider to modify uiCapabilities', async () => {
    registerCapabilitiesRoute(server, defaultCapabilities, [
      (req, caps) => {
        caps.management.section2.write = false;
        caps.myApp.write = false;
        return caps;
      },
    ]);
    const resp = await server.inject({
      method: 'POST',
      url: '/api/capabilities',
      payload: { capabilities: {} },
    });
    const results = JSON.parse(resp.payload);
    expect(results.capabilities.management.section2.write).toBe(false);
    expect(results.capabilities.myApp.write).toBe(false);
  });

  it('allows multiple providers to modify uiCapabilities', async () => {
    registerCapabilitiesRoute(server, defaultCapabilities, [
      (req, caps) => {
        caps.management.section2.write = false;
        return caps;
      },
      (req, caps) => {
        caps.myApp.write = false;
        return caps;
      },
    ]);
    const resp = await server.inject({
      method: 'POST',
      url: '/api/capabilities',
      payload: { capabilities: {} },
    });
    const results = JSON.parse(resp.payload);
    expect(results.capabilities.management.section2.write).toBe(false);
    expect(results.capabilities.myApp.write).toBe(false);
  });

  it('returns an error if any providers fail', async () => {
    registerCapabilitiesRoute(server, defaultCapabilities, [
      (req, caps) => {
        throw new Error(`Couldn't fetch license`);
      },
    ]);
    const resp = await server.inject({
      method: 'POST',
      url: '/api/capabilities',
      payload: { capabilities: {} },
    });
    expect(resp.statusCode).toBe(500);
  });
});
