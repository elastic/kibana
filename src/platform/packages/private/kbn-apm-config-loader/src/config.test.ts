/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

  it('flattens the `globalLabels` object', () => {
    const kibanaConfig = {
      elastic: {
        apm: {
          globalLabels: {
            keyOne: 'k1',
            objectOne: {
              objectOneKeyOne: 'o1k1',
              objectOneKeyTwo: {
                objectOneKeyTwoSubkeyOne: 'o1k2s1',
              },
            },
          },
        },
      },
    };
    const config = new ApmConfiguration(mockedRootDir, kibanaConfig, true);
    expect(config.getConfig('serviceName')).toEqual(
      expect.objectContaining({
        globalLabels: {
          git_rev: 'sha',
          keyOne: 'k1',
          'objectOne.objectOneKeyOne': 'o1k1',
          'objectOne.objectOneKeyTwo.objectOneKeyTwoSubkeyOne': 'o1k2s1',
        },
      })
    );
  });

  describe('env vars', () => {
    beforeEach(() => {
      delete process.env.ELASTIC_APM_ENVIRONMENT;
      delete process.env.ELASTIC_APM_SECRET_TOKEN;
      delete process.env.ELASTIC_APM_API_KEY;
      delete process.env.ELASTIC_APM_KIBANA_FRONTEND_ACTIVE;
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

    it('ELASTIC_APM_KIBANA_FRONTEND_ACTIVE', () => {
      process.env.ELASTIC_APM_KIBANA_FRONTEND_ACTIVE = 'false';
      const config = new ApmConfiguration(mockedRootDir, {}, false);
      const serverConfig = config.getConfig('servicesOverrides');
      // @ts-ignore
      expect(serverConfig.servicesOverrides).toEqual({
        'kibana-frontend': {
          active: false,
        },
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

    it('uses apiKey instead of secret token if env var is set', () => {
      process.env.ELASTIC_APM_API_KEY = 'banana';
      process.env.ELASTIC_APM_SERVER_URL = 'http://banana.com/';
      const config = new ApmConfiguration(mockedRootDir, {}, false);
      const serverConfig = config.getConfig('serviceName');
      expect(serverConfig).toHaveProperty('apiKey', process.env.ELASTIC_APM_API_KEY);
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

    it('allows overriding some services settings', () => {
      const kibanaConfig = {
        elastic: {
          apm: {
            active: true,
            serverUrl: 'http://an.internal.apm.server:port/',
            transactionSampleRate: 0.1,
            servicesOverrides: {
              externalServiceName: {
                active: false,
                serverUrl: 'http://a.public.apm.server:port/',
                disableSend: true, // just adding an extra field to prove merging works
              },
            },
          },
        },
      };

      const internalService = new ApmConfiguration(mockedRootDir, kibanaConfig, true).getConfig(
        'internalServiceName'
      );
      expect(internalService).toEqual(
        expect.objectContaining({
          active: true,
          serverUrl: 'http://an.internal.apm.server:port/',
          transactionSampleRate: 0.1,
          serviceName: 'internalServiceName',
        })
      );
      expect(internalService).not.toHaveProperty('disableSend');
      expect(internalService).not.toHaveProperty('servicesOverrides'); // We don't want to leak this to the client's config

      expect(
        new ApmConfiguration(mockedRootDir, kibanaConfig, true).getConfig('externalServiceName')
      ).toEqual(
        expect.objectContaining({
          active: false,
          serverUrl: 'http://a.public.apm.server:port/',
          transactionSampleRate: 0.1,
          disableSend: true,
          serviceName: 'externalServiceName',
        })
      );
    });
  });

  describe('isUsersRedactionEnabled', () => {
    it('defaults to true', () => {
      const kibanaConfig = {
        elastic: {
          apm: {},
        },
      };

      const config = new ApmConfiguration(mockedRootDir, kibanaConfig, false);
      expect(config.isUsersRedactionEnabled()).toEqual(true);
    });

    it('uses the value defined in the config if specified', () => {
      const kibanaConfig = {
        elastic: {
          apm: {
            redactUsers: false,
          },
        },
      };

      const config = new ApmConfiguration(mockedRootDir, kibanaConfig, false);
      expect(config.isUsersRedactionEnabled()).toEqual(false);
    });
  });
});
