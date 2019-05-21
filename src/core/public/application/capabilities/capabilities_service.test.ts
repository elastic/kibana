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

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';

import { InjectedMetadataService } from '../../injected_metadata';
import { CapabilitiesService } from './capabilities_service';
import { basePathServiceMock } from '../../base_path/base_path_service.mock';

describe('#start', () => {
  const basePath = basePathServiceMock.createStartContract();
  basePath.addToPath.mockImplementation(str => str);
  const injectedMetadata = new InjectedMetadataService({
    injectedMetadata: {
      vars: {
        uiCapabilities: {
          foo: { feature: true },
          bar: { feature: true },
        },
      },
    } as any,
  }).start();
  const apps = [{ id: 'app1' }, { id: 'app2', capabilities: { app2: { feature: true } } }] as any;

  beforeEach(() => {
    fetchMock.post('/api/capabilities', (url: string, options: any) => ({
      body: options.body,
      status: 200,
    }));
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('calls backend API with merged capabilities', async () => {
    const service = new CapabilitiesService();
    await service.start({ apps, basePath, injectedMetadata });
    expect(fetchMock.calls()).toMatchInlineSnapshot(`
Array [
  Array [
    "/api/capabilities",
    Object {
      "body": "{\\"capabilities\\":{\\"navLinks\\":{\\"app2\\":true,\\"app1\\":true},\\"management\\":{},\\"catalogue\\":{},\\"app2\\":{\\"feature\\":true}}}",
      "credentials": "same-origin",
      "headers": Object {
        "kbn-xsrf": "xxx",
      },
      "method": "POST",
    },
  ],
]
`);
  });

  it('returns capabilities from backend', async () => {
    const service = new CapabilitiesService();
    expect((await service.start({ apps, basePath, injectedMetadata })).capabilities)
      .toMatchInlineSnapshot(`
Object {
  "app2": Object {
    "feature": true,
  },
  "catalogue": Object {},
  "management": Object {},
  "navLinks": Object {
    "app1": true,
    "app2": true,
  },
}
`);
  });

  it('filters available apps based on returned navLinks', async () => {
    fetchMock.post(
      '/api/capabilities',
      (url: string, options: any) => ({
        body: JSON.stringify({ capabilities: { navLinks: { app1: true, app2: false } } }),
        status: 200,
      }),
      { overwriteRoutes: true }
    );
    const service = new CapabilitiesService();
    expect((await service.start({ apps, basePath, injectedMetadata })).availableApps).toEqual([
      { id: 'app1' },
    ]);
  });

  it('does not allow Capabilities to be modified', async () => {
    const service = new CapabilitiesService();
    const { capabilities } = await service.start({
      apps,
      basePath,
      injectedMetadata,
    });

    // @ts-ignore TypeScript knows this shouldn't be possible
    expect(() => (capabilities.foo = 'foo')).toThrowError();
  });
});
