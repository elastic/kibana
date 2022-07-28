/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Capabilities } from '@kbn/core-capabilities-common';
import { resolveCapabilities } from './resolve_capabilities';

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
    const result = await resolveCapabilities(defaultCaps, [], request, [], true);
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
    const result = await resolveCapabilities(caps, [switcher], request, [], true);
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
    await resolveCapabilities(caps, [switcher], request, [], true);
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
    const result = await resolveCapabilities(caps, [switcher], request, [], true);
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
    const result = await resolveCapabilities(caps, [switcher], request, [], true);
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
    const result = await resolveCapabilities(caps, [switcher], request, [], true);
    expect(result.section).toEqual({
      boolean: true,
      record: {
        entry: true,
      },
    });
  });
});
