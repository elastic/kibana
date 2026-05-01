/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Config } from './config';

describe('Config.getScoutTestConfig', () => {
  it(`should return a properly structured 'ScoutTestConfig' object for 'stateful'`, async () => {
    const config = new Config({
      servers: {
        elasticsearch: {
          protocol: 'http',
          hostname: 'localhost',
          port: 9220,
          username: 'kibana_system',
          password: 'changeme',
        },
        kibana: {
          protocol: 'http',
          hostname: 'localhost',
          port: 5620,
          username: 'elastic',
          password: 'changeme',
        },
      },
      dockerServers: {},
      esTestCluster: {
        from: 'snapshot',
        files: [],
        serverArgs: [],
        ssl: false,
      },
      kbnTestServer: {
        buildArgs: [],
        env: {},
        sourceArgs: [],
        serverArgs: [],
      },
    });

    const scoutConfig = config.getScoutTestConfig();

    const expectedConfig = {
      serverless: false,
      http2: false,
      uiam: false,
      projectType: undefined,
      productTier: undefined,
      isCloud: false,
      license: 'trial',
      cloudUsersFilePath: expect.stringContaining('.ftr/role_users.json'),
      hosts: {
        kibana: 'http://localhost:5620',
        elasticsearch: 'http://localhost:9220',
      },
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
      metadata: {
        generatedOn: expect.any(String),
        config: expect.any(Object),
      },
    };

    expect(scoutConfig).toEqual(expectedConfig);
  });

  it(`should return a properly structured 'ScoutTestConfig' object for 'serverless=es'`, async () => {
    const config = new Config({
      serverless: true,
      servers: {
        elasticsearch: {
          protocol: 'https',
          hostname: 'localhost',
          port: 9220,
          username: 'elastic_serverless',
          password: 'changeme',
        },
        kibana: {
          protocol: 'http',
          hostname: 'localhost',
          port: 5620,
          username: 'elastic_serverless',
          password: 'changeme',
        },
      },
      dockerServers: {},
      esTestCluster: {
        from: 'serverless',
        files: [],
        serverArgs: [],
        ssl: true,
      },
      esServerlessOptions: { uiam: true },
      kbnTestServer: {
        buildArgs: [],
        env: {},
        sourceArgs: [],
        serverArgs: ['--serverless=es'],
      },
    });

    const scoutConfig = config.getScoutTestConfig();
    const expectedConfig = {
      serverless: true,
      http2: false,
      uiam: true,
      projectType: 'es',
      productTier: undefined,
      isCloud: false,
      license: 'trial',
      cloudUsersFilePath: expect.stringContaining('.ftr/role_users.json'),
      hosts: {
        kibana: 'http://localhost:5620',
        elasticsearch: 'https://localhost:9220',
      },
      auth: {
        username: 'elastic_serverless',
        password: 'changeme',
      },
      metadata: {
        generatedOn: expect.any(String),
        config: expect.any(Object),
      },
    };

    expect(scoutConfig).toEqual(expectedConfig);
  });

  it(`reflects 'esServerlessOptions.uiam: false' in the produced ScoutTestConfig`, async () => {
    const config = new Config({
      serverless: true,
      servers: {
        elasticsearch: {
          protocol: 'https',
          hostname: 'localhost',
          port: 9220,
          username: 'elastic_serverless',
          password: 'changeme',
        },
        kibana: {
          protocol: 'http',
          hostname: 'localhost',
          port: 5620,
          username: 'elastic_serverless',
          password: 'changeme',
        },
      },
      dockerServers: {},
      esTestCluster: {
        from: 'serverless',
        files: [],
        serverArgs: [],
        ssl: true,
      },
      esServerlessOptions: { uiam: false },
      kbnTestServer: {
        buildArgs: [],
        env: {},
        sourceArgs: [],
        serverArgs: ['--serverless=es'],
      },
    });

    const scoutConfig = config.getScoutTestConfig();

    expect(scoutConfig.serverless).toBe(true);
    expect(scoutConfig.uiam).toBe(false);
  });

  it(`forces uiam to false on stateful regardless of any esServerlessOptions`, async () => {
    const config = new Config({
      serverless: false,
      servers: {
        elasticsearch: {
          protocol: 'http',
          hostname: 'localhost',
          port: 9220,
          username: 'elastic',
          password: 'changeme',
        },
        kibana: {
          protocol: 'http',
          hostname: 'localhost',
          port: 5620,
          username: 'elastic',
          password: 'changeme',
        },
      },
      dockerServers: {},
      esTestCluster: { from: 'snapshot', files: [], serverArgs: [], ssl: false },
      kbnTestServer: { buildArgs: [], env: {}, sourceArgs: [], serverArgs: [] },
    });

    expect(config.getScoutTestConfig().uiam).toBe(false);
  });

  it(`should return a properly structured 'ScoutTestConfig' object for 'serverless=es' with organizationId`, async () => {
    const config = new Config({
      serverless: true,
      servers: {
        elasticsearch: {
          protocol: 'https',
          hostname: 'localhost',
          port: 9220,
          username: 'elastic_serverless',
          password: 'changeme',
        },
        kibana: {
          protocol: 'http',
          hostname: 'localhost',
          port: 5620,
          username: 'elastic_serverless',
          password: 'changeme',
        },
      },
      dockerServers: {},
      esTestCluster: {
        from: 'serverless',
        files: [],
        serverArgs: [],
        ssl: true,
      },
      esServerlessOptions: { uiam: true },
      kbnTestServer: {
        buildArgs: [],
        env: {},
        sourceArgs: [],
        serverArgs: ['--serverless=es', '--xpack.cloud.organization_id=org123'],
      },
    });

    const scoutConfig = config.getScoutTestConfig();
    const expectedConfig = {
      serverless: true,
      http2: false,
      uiam: true,
      projectType: 'es',
      productTier: undefined,
      organizationId: 'org123',
      isCloud: false,
      license: 'trial',
      cloudUsersFilePath: expect.stringContaining('.ftr/role_users.json'),
      hosts: {
        kibana: 'http://localhost:5620',
        elasticsearch: 'https://localhost:9220',
      },
      auth: {
        username: 'elastic_serverless',
        password: 'changeme',
      },
      metadata: {
        generatedOn: expect.any(String),
        config: expect.any(Object),
      },
    };

    expect(scoutConfig).toEqual(expectedConfig);
  });

  it(`should return a properly structured 'ScoutTestConfig' object for 'serverless=security' in UIAM+CPS mode`, async () => {
    const config = new Config({
      serverless: true,
      servers: {
        elasticsearch: {
          protocol: 'https',
          hostname: 'localhost',
          port: 9220,
          username: 'elastic_serverless',
          password: 'changeme',
        },
        linkedElasticsearch: {
          protocol: 'https',
          hostname: 'localhost',
          port: 9230,
          username: 'elastic_serverless',
          password: 'changeme',
        },
        kibana: {
          protocol: 'http',
          hostname: 'localhost',
          port: 5620,
          username: 'elastic_serverless',
          password: 'changeme',
        },
      },
      dockerServers: {},
      esTestCluster: {
        from: 'serverless',
        files: [],
        serverArgs: [],
        ssl: true,
      },
      esServerlessOptions: { uiam: true, cps: true },
      kbnTestServer: {
        buildArgs: [],
        env: {},
        sourceArgs: [],
        serverArgs: ['--serverless=security', '--xpack.cloud.organization_id=org123'],
      },
    });

    const scoutConfig = config.getScoutTestConfig();

    expect(scoutConfig.linkedProject).toBeDefined();
    expect(scoutConfig.linkedProject).toEqual({
      hosts: {
        elasticsearch: 'https://localhost:9230',
      },
      auth: {
        username: 'elastic_serverless',
        password: 'changeme',
      },
    });

    expect(scoutConfig.serverless).toBe(true);
    expect(scoutConfig.uiam).toBe(true);
    expect(scoutConfig.projectType).toBe('security');
    expect(scoutConfig.productTier).toBe('complete');
    expect(scoutConfig.hosts.elasticsearch).toBe('https://localhost:9220');
  });

  it(`should not include linkedProject when CPS is not enabled`, async () => {
    const config = new Config({
      serverless: true,
      servers: {
        elasticsearch: {
          protocol: 'https',
          hostname: 'localhost',
          port: 9220,
          username: 'elastic_serverless',
          password: 'changeme',
        },
        kibana: {
          protocol: 'http',
          hostname: 'localhost',
          port: 5620,
          username: 'elastic_serverless',
          password: 'changeme',
        },
      },
      dockerServers: {},
      esTestCluster: {
        from: 'serverless',
        files: [],
        serverArgs: [],
        ssl: true,
      },
      esServerlessOptions: { uiam: true },
      kbnTestServer: {
        buildArgs: [],
        env: {},
        sourceArgs: [],
        serverArgs: ['--serverless=es'],
      },
    });

    const scoutConfig = config.getScoutTestConfig();
    expect(scoutConfig.linkedProject).toBeUndefined();
  });

  describe('productTier', () => {
    const buildServerlessConfig = (kbnServerArgs: string[]) =>
      new Config({
        serverless: true,
        servers: {
          elasticsearch: {
            protocol: 'https',
            hostname: 'localhost',
            port: 9220,
            username: 'elastic_serverless',
            password: 'changeme',
          },
          kibana: {
            protocol: 'http',
            hostname: 'localhost',
            port: 5620,
            username: 'elastic_serverless',
            password: 'changeme',
          },
        },
        dockerServers: {},
        esTestCluster: {
          from: 'serverless',
          files: [],
          serverArgs: [],
          ssl: true,
        },
        kbnTestServer: {
          buildArgs: [],
          env: {},
          sourceArgs: [],
          serverArgs: kbnServerArgs,
        },
      });

    it(`resolves 'essentials' for security essentials configs`, () => {
      const config = buildServerlessConfig([
        '--serverless=security',
        `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
          { product_line: 'cloud', product_tier: 'essentials' },
        ])}`,
      ]);

      const scoutConfig = config.getScoutTestConfig();
      expect(scoutConfig.projectType).toBe('security');
      expect(scoutConfig.productTier).toBe('essentials');
    });

    it(`resolves 'search_ai_lake' for the security ai_soc (EASE) config`, () => {
      const config = buildServerlessConfig([
        '--serverless=security',
        `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
          { product_line: 'ai_soc', product_tier: 'search_ai_lake' },
        ])}`,
      ]);

      const scoutConfig = config.getScoutTestConfig();
      expect(scoutConfig.projectType).toBe('security');
      expect(scoutConfig.productTier).toBe('search_ai_lake');
    });

    it(`defaults to 'complete' for security configs without a productTypes arg`, () => {
      const config = buildServerlessConfig(['--serverless=security']);

      const scoutConfig = config.getScoutTestConfig();
      expect(scoutConfig.projectType).toBe('security');
      expect(scoutConfig.productTier).toBe('complete');
    });

    it(`resolves 'logs_essentials' for the observability logs essentials config`, () => {
      const config = buildServerlessConfig([
        '--serverless=oblt',
        `--pricing.tiers.products=${JSON.stringify([
          { name: 'observability', tier: 'logs_essentials' },
        ])}`,
      ]);

      const scoutConfig = config.getScoutTestConfig();
      expect(scoutConfig.projectType).toBe('oblt');
      expect(scoutConfig.productTier).toBe('logs_essentials');
    });

    it(`defaults to 'complete' for oblt configs without a pricing tiers arg`, () => {
      const config = buildServerlessConfig(['--serverless=oblt']);

      const scoutConfig = config.getScoutTestConfig();
      expect(scoutConfig.projectType).toBe('oblt');
      expect(scoutConfig.productTier).toBe('complete');
    });

    it(`resolves 'undefined' for project types that don't expose a tier (e.g. es)`, () => {
      const config = buildServerlessConfig(['--serverless=es']);

      const scoutConfig = config.getScoutTestConfig();
      expect(scoutConfig.projectType).toBe('es');
      expect(scoutConfig.productTier).toBeUndefined();
    });

    it(`falls back to 'complete' when the productTypes arg is malformed JSON`, () => {
      const config = buildServerlessConfig([
        '--serverless=security',
        '--xpack.securitySolutionServerless.productTypes=not-json',
      ]);

      const scoutConfig = config.getScoutTestConfig();
      expect(scoutConfig.productTier).toBe('complete');
    });
  });
});
