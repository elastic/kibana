/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitIntoBucketsMock } from './resolve_capabilities.test.mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Capabilities } from '@kbn/core-capabilities-common';
import { getCapabilitiesResolver } from './resolve_capabilities';
import type { SwitcherWithOptions } from './types';

describe('resolveCapabilities', () => {
  let defaultCaps: Capabilities;
  let request: KibanaRequest;

  beforeEach(() => {
    splitIntoBucketsMock.mockClear();

    defaultCaps = {
      navLinks: {},
      catalogue: {},
      management: {},
    };
    request = httpServerMock.createKibanaRequest();
  });

  describe('base feature', () => {
    it('returns the initial capabilities if no switcher are used', async () => {
      const result = await getCapabilitiesResolver(
        () => defaultCaps,
        () => []
      )({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

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

      const result = await getCapabilitiesResolver(
        () => caps,
        () => [
          {
            switcher,
            capabilityPath: ['*'],
          },
        ]
      )({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

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

      await getCapabilitiesResolver(
        () => caps,
        () => [
          {
            switcher,
            capabilityPath: ['*'],
          },
        ]
      )({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

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

      const result = await getCapabilitiesResolver(
        () => caps,
        () => [
          {
            switcher,
            capabilityPath: ['*'],
          },
        ]
      )({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

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
      const result = await getCapabilitiesResolver(
        () => caps,
        () => [
          {
            switcher,
            capabilityPath: ['*'],
          },
        ]
      )({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });
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
      const result = await getCapabilitiesResolver(
        () => caps,
        () => [
          {
            switcher,
            capabilityPath: ['*'],
          },
        ]
      )({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });
      expect(result.section).toEqual({
        boolean: true,
        record: {
          entry: true,
        },
      });
    });
  });

  describe('multiple switchers', () => {
    const getCapabilities = (overrides: Partial<Capabilities>): Capabilities => {
      return {
        ...defaultCaps,
        ...overrides,
      } as Capabilities;
    };

    it('applies multiple switchers', async () => {
      const caps = getCapabilities({
        section: {
          entryA: true,
          entryB: true,
          entryC: true,
        },
      });

      const switcherA: SwitcherWithOptions = {
        switcher: (req: KibanaRequest, capabilities: Capabilities) => ({
          section: {
            entryA: false,
          },
        }),
        capabilityPath: ['*'],
      };
      const switcherB: SwitcherWithOptions = {
        switcher: (req: KibanaRequest, capabilities: Capabilities) => ({
          section: {
            entryB: false,
          },
        }),
        capabilityPath: ['*'],
      };

      const result = await getCapabilitiesResolver(
        () => caps,
        () => [switcherA, switcherB]
      )({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(result.section).toEqual({
        entryA: false,
        entryB: false,
        entryC: true,
      });
    });

    it('only applies the switchers intersecting with the requested paths', async () => {
      const caps = getCapabilities({
        section: {
          entryA: true,
          entryB: true,
          entryC: true,
        },
      });

      const switcherAFunc = jest.fn().mockResolvedValue({});
      const switcherBFunc = jest.fn().mockResolvedValue({});
      const switcherCFunc = jest.fn().mockResolvedValue({});

      const switcherA: SwitcherWithOptions = {
        switcher: switcherAFunc,
        capabilityPath: ['*'],
      };
      const switcherB: SwitcherWithOptions = {
        switcher: switcherBFunc,
        capabilityPath: ['ml.*'],
      };
      const switcherC: SwitcherWithOptions = {
        switcher: switcherCFunc,
        capabilityPath: ['fileUpload.*'],
      };

      await getCapabilitiesResolver(
        () => caps,
        () => [switcherA, switcherB, switcherC]
      )({
        request,
        capabilityPath: ['ml.*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(switcherAFunc).toHaveBeenCalledTimes(1);
      expect(switcherBFunc).toHaveBeenCalledTimes(1);
      expect(switcherCFunc).toHaveBeenCalledTimes(0);
    });

    it('returns full capabilities even if not all switchers were applied', async () => {
      const caps = getCapabilities({
        section: {
          entryA: true,
          entryB: true,
          entryC: true,
        },
      });

      const switcherA: SwitcherWithOptions = {
        switcher: (req: KibanaRequest, capabilities: Capabilities) => ({
          section: {
            entryA: false,
          },
        }),
        capabilityPath: ['section.entryA'],
      };
      const switcherB: SwitcherWithOptions = {
        switcher: (req: KibanaRequest, capabilities: Capabilities) => ({
          section: {
            entryB: false,
          },
        }),
        capabilityPath: ['section.entryB'],
      };

      const result = await getCapabilitiesResolver(
        () => caps,
        () => [switcherA, switcherB]
      )({
        request,
        capabilityPath: ['section.entryA'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(result.section).toEqual({
        entryA: false,
        entryB: true,
        entryC: true,
      });
    });
  });

  describe('caching behavior', () => {
    it('caches results between calls for the same capability path', async () => {
      const resolver = getCapabilitiesResolver(
        () => defaultCaps,
        () => []
      );

      await resolver({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(1);

      await resolver({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(1);
    });

    it('does not cache results between calls for different capability path', async () => {
      const resolver = getCapabilitiesResolver(
        () => defaultCaps,
        () => []
      );

      await resolver({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(1);

      await resolver({
        request,
        capabilityPath: ['ml.*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(2);
    });

    it('caches results between calls for the same capability paths', async () => {
      const resolver = getCapabilitiesResolver(
        () => defaultCaps,
        () => []
      );

      await resolver({
        request,
        capabilityPath: ['ml.*', 'file.*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(1);

      await resolver({
        request,
        capabilityPath: ['ml.*', 'file.*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(1);
    });

    it('does not cache results between calls for different capability paths', async () => {
      const resolver = getCapabilitiesResolver(
        () => defaultCaps,
        () => []
      );

      await resolver({
        request,
        capabilityPath: ['ml.*', 'file.*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(1);

      await resolver({
        request,
        capabilityPath: ['ml.*', 'not-file.*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(2);
    });

    it('does not cache results between calls from different resolvers', async () => {
      const resolverA = getCapabilitiesResolver(
        () => defaultCaps,
        () => []
      );
      const resolverB = getCapabilitiesResolver(
        () => defaultCaps,
        () => []
      );

      await resolverA({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(1);

      await resolverB({
        request,
        capabilityPath: ['*'],
        applications: [],
        useDefaultCapabilities: false,
      });

      expect(splitIntoBucketsMock).toHaveBeenCalledTimes(2);
    });
  });
});
