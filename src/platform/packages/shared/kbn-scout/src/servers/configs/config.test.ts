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
      uiam: false,
      projectType: undefined,
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
      uiam: false,
      projectType: 'es',
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

  it(`should return a properly structured 'ScoutTestConfig' object for 'serverless=es' in UIAM mode`, async () => {
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
      uiam: true,
      projectType: 'es',
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
});
