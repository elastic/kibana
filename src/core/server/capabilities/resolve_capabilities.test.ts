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

  it('returns the initial capabilities if no switcher are used', async () => {
    const result = await resolveCapabilities(defaultCaps, [], request, []);
    expect(result).toEqual(defaultCaps);
  });

  it('applies the switcher to the capabilities ', async () => {
    const caps = {
      ...defaultCaps,
      catalogue: {
        A: true,
        B: true,
      },
    };
    const switcher = (req: KibanaRequest, capabilities: Capabilities) => ({
      ...capabilities,
      catalogue: {
        ...capabilities.catalogue,
        A: false,
      },
    });
    const result = await resolveCapabilities(caps, [switcher], request, []);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "catalogue": Object {
          "A": false,
          "B": true,
        },
        "management": Object {},
        "navLinks": Object {},
      }
    `);
  });

  it('does not mutate the input capabilities', async () => {
    const caps = {
      ...defaultCaps,
      catalogue: {
        A: true,
        B: true,
      },
    };
    const switcher = (req: KibanaRequest, capabilities: Capabilities) => ({
      ...capabilities,
      catalogue: {
        ...capabilities.catalogue,
        A: false,
      },
    });
    await resolveCapabilities(caps, [switcher], request, []);
    expect(caps.catalogue).toEqual({
      A: true,
      B: true,
    });
  });

  it('ignores any added capability from the switcher', async () => {
    const caps = {
      ...defaultCaps,
      catalogue: {
        A: true,
        B: true,
      },
    };
    const switcher = (req: KibanaRequest, capabilities: Capabilities) => ({
      ...capabilities,
      catalogue: {
        ...capabilities.catalogue,
        C: false,
      },
    });
    const result = await resolveCapabilities(caps, [switcher], request, []);
    expect(result.catalogue).toEqual({
      A: true,
      B: true,
    });
  });

  it('ignores any removed capability from the switcher', async () => {
    const caps = {
      ...defaultCaps,
      catalogue: {
        A: true,
        B: true,
        C: true,
      },
    };
    const switcher = (req: KibanaRequest, capabilities: Capabilities) => ({
      ...capabilities,
      catalogue: Object.entries(capabilities.catalogue)
        .filter(([key]) => key !== 'B')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
    });
    const result = await resolveCapabilities(caps, [switcher], request, []);
    expect(result.catalogue).toEqual({
      A: true,
      B: true,
      C: true,
    });
  });

  it('ignores any capability type mutation from the switcher', async () => {
    const caps = {
      ...defaultCaps,
      section: {
        boolean: true,
        record: {
          entry: true,
        },
      },
    };
    const switcher = (req: KibanaRequest, capabilities: Capabilities) => ({
      section: {
        boolean: {
          entry: false,
        },
        record: false,
      },
    });
    const result = await resolveCapabilities(caps, [switcher], request, []);
    expect(result.section).toEqual({
      boolean: true,
      record: {
        entry: true,
      },
    });
  });
});
