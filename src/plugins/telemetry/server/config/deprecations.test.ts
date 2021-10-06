/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { configDeprecationsMock } from '../../../../core/server/mocks';
import { deprecateEndpointConfigs } from './deprecations';
import type { TelemetryConfigType } from './config';
import { TELEMETRY_ENDPOINT } from '../../common/constants';

describe('deprecateEndpointConfigs', () => {
  const fromPath = 'telemetry';
  const mockAddDeprecation = jest.fn();
  const deprecationContext = configDeprecationsMock.createContext();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createMockRawConfig(telemetryConfig?: Partial<TelemetryConfigType>) {
    return {
      elasticsearch: { username: 'kibana_system', password: 'changeme' },
      plugins: { paths: [] },
      server: { port: 5603, basePath: '/hln', rewriteBasePath: true },
      logging: { json: false },
      ...(telemetryConfig ? { telemetry: telemetryConfig } : {}),
    };
  }

  it('returns void if telemetry.* config is not set', () => {
    const rawConfig = createMockRawConfig();
    const result = deprecateEndpointConfigs(
      rawConfig,
      fromPath,
      mockAddDeprecation,
      deprecationContext
    );
    expect(result).toBe(undefined);
  });

  it('sets "telemetryConfig.sendUsageTo: staging" if "telemetry.url" uses the staging endpoint', () => {
    const rawConfig = createMockRawConfig({
      url: TELEMETRY_ENDPOINT.MAIN_CHANNEL.STAGING,
    });
    const result = deprecateEndpointConfigs(
      rawConfig,
      fromPath,
      mockAddDeprecation,
      deprecationContext
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "set": Array [
          Object {
            "path": "telemetry.sendUsageTo",
            "value": "staging",
          },
        ],
        "unset": Array [
          Object {
            "path": "telemetry.url",
          },
        ],
      }
    `);
  });

  it('sets "telemetryConfig.sendUsageTo: prod" if "telemetry.url" uses the non-staging endpoint', () => {
    const rawConfig = createMockRawConfig({
      url: 'random-endpoint',
    });
    const result = deprecateEndpointConfigs(
      rawConfig,
      fromPath,
      mockAddDeprecation,
      deprecationContext
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "set": Array [
          Object {
            "path": "telemetry.sendUsageTo",
            "value": "prod",
          },
        ],
        "unset": Array [
          Object {
            "path": "telemetry.url",
          },
        ],
      }
    `);
  });

  it('sets "telemetryConfig.sendUsageTo: staging" if "telemetry.optInStatusUrl" uses the staging endpoint', () => {
    const rawConfig = createMockRawConfig({
      optInStatusUrl: TELEMETRY_ENDPOINT.MAIN_CHANNEL.STAGING,
    });
    const result = deprecateEndpointConfigs(
      rawConfig,
      fromPath,
      mockAddDeprecation,
      deprecationContext
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "set": Array [
          Object {
            "path": "telemetry.sendUsageTo",
            "value": "staging",
          },
        ],
        "unset": Array [
          Object {
            "path": "telemetry.optInStatusUrl",
          },
        ],
      }
    `);
  });

  it('sets "telemetryConfig.sendUsageTo: prod" if "telemetry.optInStatusUrl" uses the non-staging endpoint', () => {
    const rawConfig = createMockRawConfig({
      optInStatusUrl: 'random-endpoint',
    });
    const result = deprecateEndpointConfigs(
      rawConfig,
      fromPath,
      mockAddDeprecation,
      deprecationContext
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "set": Array [
          Object {
            "path": "telemetry.sendUsageTo",
            "value": "prod",
          },
        ],
        "unset": Array [
          Object {
            "path": "telemetry.optInStatusUrl",
          },
        ],
      }
    `);
  });

  it('registers deprecation when "telemetry.url" is set', () => {
    const rawConfig = createMockRawConfig({
      url: TELEMETRY_ENDPOINT.MAIN_CHANNEL.PROD,
    });
    deprecateEndpointConfigs(rawConfig, fromPath, mockAddDeprecation, deprecationContext);
    expect(mockAddDeprecation).toBeCalledTimes(1);
    expect(mockAddDeprecation.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctiveActions": Object {
            "manualSteps": Array [
              "Remove \\"telemetry.url\\" from the Kibana configuration.",
              "To send usage to the staging endpoint add \\"telemetry.sendUsageTo: staging\\" to the Kibana configuration.",
            ],
          },
          "message": "\\"telemetry.url\\" has been deprecated. Set \\"telemetry.sendUsageTo: staging\\" to the Kibana configurations to send usage to the staging endpoint.",
          "title": "Setting \\"telemetry.url\\" is deprecated",
        },
      ]
    `);
  });

  it('registers deprecation when "telemetry.optInStatusUrl" is set', () => {
    const rawConfig = createMockRawConfig({
      optInStatusUrl: 'random-endpoint',
    });
    deprecateEndpointConfigs(rawConfig, fromPath, mockAddDeprecation, deprecationContext);
    expect(mockAddDeprecation).toBeCalledTimes(1);
    expect(mockAddDeprecation.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctiveActions": Object {
            "manualSteps": Array [
              "Remove \\"telemetry.optInStatusUrl\\" from the Kibana configuration.",
              "To send usage to the staging endpoint add \\"telemetry.sendUsageTo: staging\\" to the Kibana configuration.",
            ],
          },
          "message": "\\"telemetry.optInStatusUrl\\" has been deprecated. Set \\"telemetry.sendUsageTo: staging\\" to the Kibana configurations to send usage to the staging endpoint.",
          "title": "Setting \\"telemetry.optInStatusUrl\\" is deprecated",
        },
      ]
    `);
  });
});
