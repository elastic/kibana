/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestTarget, testTargets } from '@kbn/scout-info';
import { Config } from '../../config';
import { getScoutTargetDomain, getScoutTestTarget, SERVERLESS_DOMAINS } from './scout_test_target';

const createConfig = (settings: Record<string, unknown>) =>
  new Config({
    settings: {
      servers: {
        elasticsearch: { port: 9220 },
        kibana: { port: 5620 },
      },
      ...settings,
    },
    primary: true,
    path: __filename,
    module: { type: 'config', path: __filename, provider: jest.fn() },
  });

describe('getScoutTestTarget', () => {
  const originalTestCloud = process.env.TEST_CLOUD;

  beforeEach(() => {
    delete process.env.TEST_CLOUD;
    jest.spyOn(ScoutTestTarget, 'tryFromEnv').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalTestCloud === undefined) {
      delete process.env.TEST_CLOUD;
    } else {
      process.env.TEST_CLOUD = originalTestCloud;
    }
  });

  it('prefers the target from the environment', () => {
    jest
      .spyOn(ScoutTestTarget, 'tryFromEnv')
      .mockReturnValue(new ScoutTestTarget('cloud', 'serverless', 'security_complete'));

    expect(getScoutTestTarget(createConfig({}))).toEqual({
      type: 'cloud',
      mode: 'serverless-security_complete',
    });
  });

  it('resolves stateful configs to stateful-classic', () => {
    expect(getScoutTestTarget(createConfig({}))).toEqual({
      type: 'local',
      mode: 'stateful-classic',
    });
  });

  it('resolves serverless configs from the Kibana server arguments', () => {
    const config = createConfig({
      serverless: true,
      kbnTestServer: {
        serverArgs: [
          '--serverless=oblt',
          `--pricing.tiers.products=${JSON.stringify([
            { name: 'observability', tier: 'logs_essentials' },
          ])}`,
        ],
      },
    });

    expect(getScoutTestTarget(config)).toEqual({
      type: 'local',
      mode: 'serverless-observability_logs_essentials',
    });
  });

  it('uses the cloud location when TEST_CLOUD is set', () => {
    process.env.TEST_CLOUD = '1';
    const config = createConfig({
      serverless: true,
      kbnTestServer: { serverArgs: ['--serverless=es'] },
    });

    expect(getScoutTestTarget(config)).toEqual({ type: 'cloud', mode: 'serverless-search' });
  });

  it('reports an unknown mode when the serverless target cannot be determined', () => {
    expect(getScoutTestTarget(createConfig({ serverless: true }))).toEqual({
      type: 'local',
      mode: 'unknown',
    });
  });
});

const createServerlessConfig = (serverArgs: string[]) =>
  createConfig({ serverless: true, kbnTestServer: { serverArgs } });

const securityProductTypes = (
  productTypes: Array<{ product_line: string; product_tier: string }>
) => `--xpack.securitySolutionServerless.productTypes=${JSON.stringify(productTypes)}`;

const obltProducts = (tier: string) =>
  `--pricing.tiers.products=${JSON.stringify([{ name: 'observability', tier }])}`;

describe('getScoutTargetDomain', () => {
  it('resolves stateful configs to the classic domain', () => {
    expect(
      getScoutTargetDomain(createConfig({ kbnTestServer: { serverArgs: ['--serverless=oblt'] } }))
    ).toBe('classic');
  });

  it.each([
    [['--serverless=es'], 'search'],
    [['--serverless=oblt'], 'observability_complete'],
    [['--serverless=oblt', obltProducts('complete')], 'observability_complete'],
    [['--serverless=oblt', obltProducts('logs_essentials')], 'observability_logs_essentials'],
    [['--serverless=security'], 'security_complete'],
    [
      [
        '--serverless=security',
        securityProductTypes([{ product_line: 'security', product_tier: 'complete' }]),
      ],
      'security_complete',
    ],
    [
      [
        '--serverless=security',
        securityProductTypes([
          { product_line: 'endpoint', product_tier: 'complete' },
          { product_line: 'security', product_tier: 'essentials' },
        ]),
      ],
      'security_essentials',
    ],
    [
      [
        '--serverless=security',
        securityProductTypes([{ product_line: 'ai_soc', product_tier: 'search_ai_lake' }]),
      ],
      'security_ease',
    ],
    [['--serverless=vectordb'], 'vectordb'],
  ])('resolves %j to %s', (serverArgs, domain) => {
    expect(getScoutTargetDomain(createServerlessConfig(serverArgs))).toBe(domain);
  });

  it.each([
    [[]],
    [['--serverless']],
    [['--serverless=unsupported']],
    [['--serverless=oblt', obltProducts('essentials')]],
    [
      [
        '--serverless=security',
        securityProductTypes([{ product_line: 'security', product_tier: 'logs_essentials' }]),
      ],
    ],
  ])('returns undefined for %j', (serverArgs) => {
    expect(getScoutTargetDomain(createServerlessConfig(serverArgs))).toBeUndefined();
  });

  it('returns undefined for invalid Kibana CLI arguments', () => {
    expect(getScoutTargetDomain(createServerlessConfig(['serverless=oblt']))).toBeUndefined();
  });

  it('maps every serverless Scout test target domain', () => {
    const serverlessDomains = new Set(
      testTargets.all.filter(({ arch }) => arch === 'serverless').map(({ domain }) => domain)
    );
    expect(new Set(Object.values(SERVERLESS_DOMAINS))).toEqual(serverlessDomains);
  });
});
