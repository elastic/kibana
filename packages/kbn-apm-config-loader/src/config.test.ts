/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  packageMock,
  mockedRootDir,
  gitRevExecMock,
  devConfigMock,
  readUuidFileMock,
  resetAllMocks,
} from './config.test.mocks';

import { ApmConfiguration } from './config';

const initialEnv = { ...process.env };

describe('ApmConfiguration', () => {
  beforeEach(() => {
    packageMock.raw = {
      version: '8.0.0',
      build: {
        sha: 'sha',
      },
    };
  });

  afterEach(() => {
    process.env = { ...initialEnv };
    resetAllMocks();
  });

  it('sets the correct service name and version', () => {
    packageMock.raw = {
      version: '9.2.1',
    };
    const config = new ApmConfiguration(mockedRootDir, {}, false);
    expect(config.getConfig('myservice').serviceName).toBe('myservice');
    expect(config.getConfig('myservice').serviceVersion).toBe('9.2.1');
  });

  it('sets the git revision from `git rev-parse` command in non distribution mode', () => {
    gitRevExecMock.mockReturnValue('some-git-rev');
    const config = new ApmConfiguration(mockedRootDir, {}, false);
    expect(config.getConfig('serviceName').globalLabels.git_rev).toBe('some-git-rev');
  });

  it('sets the git revision from `pkg.build.sha` in distribution mode', () => {
    gitRevExecMock.mockReturnValue('dev-sha');
    packageMock.raw = {
      version: '9.2.1',
      build: {
        sha: 'distribution-sha',
      },
    };
    const config = new ApmConfiguration(mockedRootDir, {}, true);
    expect(config.getConfig('serviceName').globalLabels.git_rev).toBe('distribution-sha');
  });

  it('reads the kibana uuid from the uuid file', () => {
    readUuidFileMock.mockReturnValue('instance-uuid');
    const config = new ApmConfiguration(mockedRootDir, {}, false);
    expect(config.getConfig('serviceName').globalLabels.kibana_uuid).toBe('instance-uuid');
  });

  it('uses the uuid from the kibana config if present', () => {
    readUuidFileMock.mockReturnValue('uuid-from-file');
    const kibanaConfig = {
      server: {
        uuid: 'uuid-from-config',
      },
    };
    const config = new ApmConfiguration(mockedRootDir, kibanaConfig, false);
    expect(config.getConfig('serviceName').globalLabels.kibana_uuid).toBe('uuid-from-config');
  });

  it('uses the correct default config depending on the `isDistributable` parameter', () => {
    let config = new ApmConfiguration(mockedRootDir, {}, false);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        breakdownMetrics: true,
      })
    );

    config = new ApmConfiguration(mockedRootDir, {}, true);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        breakdownMetrics: false,
      })
    );
  });

  it('loads the configuration from the kibana config file', () => {
    const kibanaConfig = {
      elastic: {
        apm: {
          active: true,
          serverUrl: 'https://url',
          secretToken: 'secret',
        },
      },
    };
    const config = new ApmConfiguration(mockedRootDir, kibanaConfig, true);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        active: true,
        serverUrl: 'https://url',
        secretToken: 'secret',
      })
    );
  });

  it('loads the configuration from the dev config is present', () => {
    devConfigMock.raw = {
      active: true,
      serverUrl: 'https://dev-url.co',
    };
    const config = new ApmConfiguration(mockedRootDir, {}, true);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        active: true,
        serverUrl: 'https://dev-url.co',
      })
    );
  });

  it('respect the precedence of the dev config', () => {
    const kibanaConfig = {
      elastic: {
        apm: {
          active: true,
          serverUrl: 'https://url',
          secretToken: 'secret',
        },
      },
    };
    devConfigMock.raw = {
      active: true,
      serverUrl: 'https://dev-url.co',
    };
    const config = new ApmConfiguration(mockedRootDir, kibanaConfig, true);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        active: true,
        serverUrl: 'https://dev-url.co',
        secretToken: 'secret',
      })
    );
  });

  it('correctly sets environment', () => {
    delete process.env.ELASTIC_APM_ENVIRONMENT;
    delete process.env.NODE_ENV;

    let config = new ApmConfiguration(mockedRootDir, {}, false);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        environment: 'development',
      })
    );

    process.env.NODE_ENV = 'production';
    config = new ApmConfiguration(mockedRootDir, {}, false);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        environment: 'production',
      })
    );

    process.env.ELASTIC_APM_ENVIRONMENT = 'ci';
    config = new ApmConfiguration(mockedRootDir, {}, false);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        environment: 'ci',
      })
    );
  });
});
