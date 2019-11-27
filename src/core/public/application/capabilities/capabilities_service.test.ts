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

import { httpServiceMock, HttpSetupMock } from '../../http/http_service.mock';
import { CapabilitiesService } from './capabilities_service';
import { LegacyApp, App } from '../types';

const mockedCapabilities = {
  catalogue: {},
  management: {},
  navLinks: {
    app1: true,
    app2: false,
    legacyApp1: true,
    legacyApp2: false,
  },
  foo: { feature: true },
  bar: { feature: true },
};

describe('#start', () => {
  let http: HttpSetupMock;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    http.post.mockReturnValue(Promise.resolve(mockedCapabilities));
  });

  const apps = new Map([
    ['app1', { id: 'app1' }],
    ['app2', { id: 'app2', capabilities: { app2: { feature: true } } }],
    ['appMissingInCapabilities', { id: 'appMissingInCapabilities' }],
  ] as Array<[string, App]>);
  const legacyApps = new Map([
    ['legacyApp1', { id: 'legacyApp1' }],
    ['legacyApp2', { id: 'legacyApp2', capabilities: { app2: { feature: true } } }],
  ] as Array<[string, LegacyApp]>);

  it('filters available apps based on returned navLinks', async () => {
    const service = new CapabilitiesService();
    const startContract = await service.start({ apps, legacyApps, http });
    expect(startContract.availableApps).toEqual(
      new Map([
        ['app1', { id: 'app1' }],
        ['appMissingInCapabilities', { id: 'appMissingInCapabilities' }],
      ])
    );
    expect(startContract.availableLegacyApps).toEqual(
      new Map([['legacyApp1', { id: 'legacyApp1' }]])
    );
  });

  it('does not allow Capabilities to be modified', async () => {
    const service = new CapabilitiesService();
    const { capabilities } = await service.start({
      apps,
      legacyApps,
      http,
    });

    // @ts-ignore TypeScript knows this shouldn't be possible
    expect(() => (capabilities.foo = 'foo')).toThrowError();
  });
});
