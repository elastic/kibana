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

  it('only returns capabilities for given appIds', async () => {
    const service = new CapabilitiesService();
    const { capabilities } = await service.start({
      http,
      appIds: ['app1', 'app2', 'legacyApp1', 'legacyApp2'],
    });

    // @ts-ignore TypeScript knows this shouldn't be possible
    expect(() => (capabilities.foo = 'foo')).toThrowError();
  });

  it('does not allow Capabilities to be modified', async () => {
    const service = new CapabilitiesService();
    const { capabilities } = await service.start({
      http,
      appIds: ['app1', 'app2', 'legacyApp1', 'legacyApp2'],
    });

    // @ts-ignore TypeScript knows this shouldn't be possible
    expect(() => (capabilities.foo = 'foo')).toThrowError();
  });
});
