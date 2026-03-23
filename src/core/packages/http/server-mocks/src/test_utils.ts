/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import moment from 'moment';
import { REPO_ROOT } from '@kbn/repo-info';
import { ByteSizeValue } from '@kbn/config-schema';
import { Env } from '@kbn/config';
import { getEnvOptions, configServiceMock } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { IRouter } from '@kbn/core-http-server';
import {
  type HttpConfigType,
  type ExternalUrlConfigType,
  type CspConfigType,
  HttpService,
  config,
} from '@kbn/core-http-server-internal';
import { lazyObject } from '@kbn/lazy-object';

const coreId = Symbol('core');
const env = Env.createDefault(REPO_ROOT, getEnvOptions());

const logger = loggingSystemMock.create();

export const createConfigService = ({
  server,
  externalUrl,
  csp,
}: Partial<{
  server: Partial<HttpConfigType>;
  externalUrl: Partial<ExternalUrlConfigType>;
  csp: Partial<CspConfigType>;
}> = {}) => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation((path) => {
    if (path === 'server') {
      return new BehaviorSubject(
        Object.assign(
          config.schema.validate({}),
          {
            name: 'kibana',
            hosts: ['localhost'],
            maxPayload: new ByteSizeValue(1024),
            autoListen: true,
            ssl: {
              enabled: false,
            },
            cors: {
              enabled: false,
            },
            compression: { enabled: true, brotli: { enabled: false } },
            xsrf: {
              disableProtection: true,
              allowlist: [],
            },
            securityResponseHeaders: {},
            customResponseHeaders: {},
            requestId: {
              allowFromAnyIp: true,
              ipAllowlist: [],
            },
            shutdownTimeout: moment.duration(30, 'seconds'),
            keepaliveTimeout: 120_000,
            socketTimeout: 120_000,
            restrictInternalApis: false, // disable restriction for Kibana tests
            versioned: {
              versionResolution: 'oldest',
              strictClientVersionCheck: true,
            },
          },
          server
        )
      );
    }
    if (path === 'externalUrl') {
      return new BehaviorSubject({
        policy: [],
        ...externalUrl,
      } as any);
    }
    if (path === 'csp') {
      return new BehaviorSubject({
        strict: false,
        disableEmbedding: false,
        warnLegacyBrowsers: true,
        ...csp,
      });
    }
    if (path === 'permissionsPolicy') {
      return new BehaviorSubject({
        report_to: [],
      });
    }
    if (path === 'pricing') {
      return new BehaviorSubject({
        tiers: {
          enabled: true,
          products: [],
        },
      });
    }
    throw new Error(`Unexpected config path: ${path}`);
  });
  return configService;
};

const createDefaultContext = (): CoreContext => {
  return lazyObject({
    coreId,
    env,
    logger,
    configService: createConfigService(),
  });
};

export const createCoreContext = (overrides: Partial<CoreContext> = {}): CoreContext =>
  lazyObject({
    ...createDefaultContext(),
    ...overrides,
  });

/**
 * A mock of the HttpService that can be used in tests.
 *
 * @remarks intended to mirror the pubilc HTTP contracts where possible to avoid
 *          drifting or leaking too many internal details of the actual HttpService.
 */
export interface HttpIntegrationTestService {
  preboot: () => Promise<void>;
  setup: () => Promise<{ createRouter: (path: string) => IRouter<any>; server: { listener: any } }>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export type HttpIntegrationServicePrebootContractMock = Awaited<
  ReturnType<HttpIntegrationTestService['preboot']>
>;

export type HttpIntegrationServiceSetupContractMock = Awaited<
  ReturnType<HttpIntegrationTestService['setup']>
>;

export type HttpIntegrationServiceStartContractMock = Awaited<
  ReturnType<HttpIntegrationTestService['start']>
>;

export type HttpIntegrationServiceStopContractMock = Awaited<
  ReturnType<HttpIntegrationTestService['stop']>
>;

/**
 * Creates an HTTP service instance for external services to test against.
 * @public
 */
export const createHttpService = (): HttpIntegrationTestService => {
  const ctx = createCoreContext();
  const svc = new HttpService(ctx);
  return {
    preboot: async () => {
      await svc.preboot({
        context: contextServiceMock.createPrebootContract(),
        docLinks: docLinksServiceMock.createSetupContract(),
      });
    },
    setup: () => {
      return svc.setup({
        context: contextServiceMock.createSetupContract(),
        executionContext: executionContextServiceMock.createInternalSetupContract(),
        userActivity: userActivityServiceMock.createInternalSetupContract(),
      });
    },
    start: async () => {
      await svc.start();
    },
    stop: async () => {
      await svc.stop();
    },
  };
};
