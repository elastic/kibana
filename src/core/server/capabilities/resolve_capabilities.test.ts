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

import { Capabilities } from './types';
import { resolveCapabilities } from './resolve_capabilities';
import { KibanaRequest } from '../http';
import { httpServerMock } from '../http/http_server.mocks';

describe('resolveCapabilities', () => {
  let defaultCaps: Capabilities;
  let request: KibanaRequest;

  beforeEach(() => {
    defaultCaps = {
      navLinks: {},
      catalogue: {},
      management: {},
    };
    request = httpServerMock.createKibanaRequest();
  });

  it('should returns the initial capabilities if no switcher are used', async () => {
    const result = await resolveCapabilities(defaultCaps, [], request);
    expect(result).toEqual(defaultCaps);
  });

  it('should apply the switcher to the capabilities ', async () => {
    const caps = {
      ...defaultCaps,
      navLinks: {
        A: true,
        B: true,
      },
    };
    const switcher = (req: KibanaRequest, capabilities: Capabilities) => ({
      ...capabilities,
      navLinks: {
        ...capabilities.navLinks,
        A: false,
      },
    });
    const result = await resolveCapabilities(caps, [switcher], request);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "catalogue": Object {},
        "management": Object {},
        "navLinks": Object {
          "A": false,
          "B": true,
        },
      }
    `);
  });
});
