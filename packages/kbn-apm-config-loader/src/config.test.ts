/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AgentConfigOptions, Labels } from 'elastic-apm-node';
import {
  packageMock,
  mockedRootDir,
  gitRevExecMock,
  readUuidFileMock,
  resetAllMocks,
} from './config.test.mocks';

import { ApmConfiguration, CENTRALIZED_SERVICE_BASE_CONFIG } from './config';

describe('ApmConfiguration', () => {
  beforeEach(() => {
    // start with an empty env to avoid CI from spoiling snapshots, env is unique for each jest file
    process.env = {};
    packageMock.raw = {
      version: '8.0.0',
      build: {
        sha: 'sha',
      },
    };
  });

  afterEach(() => {
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
    const labels = config.getConfig('serviceName').globalLabels as Labels;
    expect(labels.git_rev).toBe('some-git-rev');
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
    const labels = config.getConfig('serviceName').globalLabels as Labels;
    expect(labels.git_rev).toBe('distribution-sha');
  });

  it('reads the kibana uuid from the uuid file', () => {
    readUuidFileMock.mockReturnValue('instance-uuid');
    const config = new ApmConfiguration(mockedRootDir, {}, false);
    const labels = config.getConfig('serviceName').globalLabels as Labels;
    expect(labels.kibana_uuid).toBe('instance-uuid');
  });

  it('uses the uuid from the kibana config if present', () => {
    readUuidFileMock.mockReturnValue('uuid-from-file');
    const kibanaConfig = {
      server: {
        uuid: 'uuid-from-config',
      },
    };
    const config = new ApmConfiguration(mockedRootDir, kibanaConfig, false);
    const labels = config.getConfig('serviceName').globalLabels as Labels;
    expect(labels.kibana_uuid).toBe('uuid-from-config');
  });

  it('overrides metricsInterval, breakdownMetrics, captureHeaders, and captureBody when `isDistributable` is true', () => {
    let config = new ApmConfiguration(mockedRootDir, {}, false);
    expect(config.getConfig('serviceName')).toMatchInlineSnapshot(`
      Object {
        "active": true,
        "breakdownMetrics": true,
        "captureSpanStackTraces": false,
        "centralConfig": false,
        "contextPropagationOnly": true,
        "environment": "development",
        "globalLabels": Object {},
        "logUncaughtExceptions": true,
        "metricsInterval": "30s",
        "propagateTracestate": true,
        "secretToken": "JpBCcOQxN81D5yucs2",
        "serverUrl": "https://kibana-cloud-apm.apm.us-east-1.aws.found.io",
        "serviceName": "serviceName",
        "serviceVersion": "8.0.0",
        "transactionSampleRate": 1,
      }
    `);

    config = new ApmConfiguration(mockedRootDir, {}, true);
    expect(config.getConfig('serviceName')).toMatchInlineSnapshot(`
      Object {
        "active": true,
        "breakdownMetrics": false,
        "captureBody": "off",
        "captureHeaders": false,
        "captureSpanStackTraces": false,
        "centralConfig": false,
        "contextPropagationOnly": true,
        "environment": "development",
        "globalLabels": Object {
          "git_rev": "sha",
        },
        "logUncaughtExceptions": true,
        "metricsInterval": "120s",
        "propagateTracestate": true,
        "secretToken": "JpBCcOQxN81D5yucs2",
        "serverUrl": "https://kibana-cloud-apm.apm.us-east-1.aws.found.io",
        "serviceName": "serviceName",
        "serviceVersion": "8.0.0",
        "transactionSampleRate": 0.1,
      }
    `);
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

  describe('env vars', () => {
    beforeEach(() => {
      delete process.env.ELASTIC_APM_ENVIRONMENT;
      delete process.env.ELASTIC_APM_SECRET_TOKEN;
      delete process.env.ELASTIC_APM_SERVER_URL;
      delete process.env.NODE_ENV;
    });

    describe('correctly sets environment by reading env vars', () => {
      it('no env var', () => {
        const config = new ApmConfiguration(mockedRootDir, {}, false);
        expect(config.getConfig('serviceName')).toEqual(
          expect.objectContaining({
            environment: 'development',
          })
        );
      });

      it('NODE_ENV', () => {
        process.env.NODE_ENV = 'production';
        const config = new ApmConfiguration(mockedRootDir, {}, false);
        expect(config.getConfig('serviceName')).toEqual(
          expect.objectContaining({
            environment: 'production',
          })
        );
      });

      it('ELASTIC_APM_ENVIRONMENT', () => {
        process.env.ELASTIC_APM_ENVIRONMENT = 'ci';
        const config = new ApmConfiguration(mockedRootDir, {}, false);
        expect(config.getConfig('serviceName')).toEqual(
          expect.objectContaining({
            environment: 'ci',
          })
        );
      });
    });

    it('does not override the environment from NODE_ENV if already set in the config file', () => {
      const kibanaConfig = {
        elastic: {
          apm: {
            environment: 'local',
          },
        },
      };

      process.env.NODE_ENV = 'production';

      const config = new ApmConfiguration(mockedRootDir, kibanaConfig, false);
      expect(config.getConfig('serviceName')).toEqual(
        expect.objectContaining({
          environment: 'local',
        })
      );
    });

    it('uses default config if serverUrl is not set', () => {
      process.env.ELASTIC_APM_SECRET_TOKEN = 'banana';
      const config = new ApmConfiguration(mockedRootDir, {}, false);
      const serverConfig = config.getConfig('serviceName');
      expect(serverConfig).toHaveProperty(
        'secretToken',
        (CENTRALIZED_SERVICE_BASE_CONFIG as AgentConfigOptions).secretToken
      );
      expect(serverConfig).toHaveProperty('serverUrl', CENTRALIZED_SERVICE_BASE_CONFIG.serverUrl);
    });

    it('uses env vars config if serverUrl is set', () => {
      process.env.ELASTIC_APM_SECRET_TOKEN = 'banana';
      process.env.ELASTIC_APM_SERVER_URL = 'http://banana.com/';
      const config = new ApmConfiguration(mockedRootDir, {}, false);
      const serverConfig = config.getConfig('serviceName');
      expect(serverConfig).toHaveProperty('secretToken', process.env.ELASTIC_APM_SECRET_TOKEN);
      expect(serverConfig).toHaveProperty('serverUrl', process.env.ELASTIC_APM_SERVER_URL);
    });
  });

  describe('contextPropagationOnly', () => {
    it('sets "active: true" and "contextPropagationOnly: true" by default', () => {
      expect(new ApmConfiguration(mockedRootDir, {}, false).getConfig('serviceName')).toEqual(
        expect.objectContaining({
          active: true,
          contextPropagationOnly: true,
        })
      );

      expect(new ApmConfiguration(mockedRootDir, {}, true).getConfig('serviceName')).toEqual(
        expect.objectContaining({
          active: true,
          contextPropagationOnly: true,
        })
      );
    });

    it('value from config overrides the default', () => {
      const kibanaConfig = {
        elastic: {
          apm: {
            active: false,
            contextPropagationOnly: false,
          },
        },
      };

      expect(
        new ApmConfiguration(mockedRootDir, kibanaConfig, false).getConfig('serviceName')
      ).toEqual(
        expect.objectContaining({
          active: false,
          contextPropagationOnly: false,
        })
      );

      expect(
        new ApmConfiguration(mockedRootDir, kibanaConfig, true).getConfig('serviceName')
      ).toEqual(
        expect.objectContaining({
          active: false,
          contextPropagationOnly: false,
        })
      );
    });

    it('is "false" if "active: true" configured and "contextPropagationOnly" is not specified', () => {
      const kibanaConfig = {
        elastic: {
          apm: {
            active: true,
          },
        },
      };

      expect(
        new ApmConfiguration(mockedRootDir, kibanaConfig, false).getConfig('serviceName')
      ).toEqual(
        expect.objectContaining({
          active: true,
          contextPropagationOnly: false,
        })
      );

      expect(
        new ApmConfiguration(mockedRootDir, kibanaConfig, true).getConfig('serviceName')
      ).toEqual(
        expect.objectContaining({
          active: true,
          contextPropagationOnly: false,
        })
      );
    });

    it('throws if "active: false" set without configuring "contextPropagationOnly: false"', () => {
      const kibanaConfig = {
        elastic: {
          apm: {
            active: false,
          },
        },
      };

      expect(() =>
        new ApmConfiguration(mockedRootDir, kibanaConfig, false).getConfig('serviceName')
      ).toThrowErrorMatchingInlineSnapshot(
        `"APM is disabled, but context propagation is enabled. Please disable context propagation with contextPropagationOnly:false"`
      );

      expect(() =>
        new ApmConfiguration(mockedRootDir, kibanaConfig, true).getConfig('serviceName')
      ).toThrowErrorMatchingInlineSnapshot(
        `"APM is disabled, but context propagation is enabled. Please disable context propagation with contextPropagationOnly:false"`
      );
    });

    it('does not throw if "active: false" and "contextPropagationOnly: false" configured', () => {
      const kibanaConfig = {
        elastic: {
          apm: {
            active: false,
            contextPropagationOnly: false,
          },
        },
      };

      expect(
        new ApmConfiguration(mockedRootDir, kibanaConfig, false).getConfig('serviceName')
      ).toEqual(
        expect.objectContaining({
          active: false,
          contextPropagationOnly: false,
        })
      );

      expect(
        new ApmConfiguration(mockedRootDir, kibanaConfig, true).getConfig('serviceName')
      ).toEqual(
        expect.objectContaining({
          active: false,
          contextPropagationOnly: false,
        })
      );
    });
  });
});
