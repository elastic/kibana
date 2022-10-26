/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import moment from 'moment';
import { REPO_ROOT } from '@kbn/utils';
import { ByteSizeValue } from '@kbn/config-schema';
import { Env } from '@kbn/config';
import { getEnvOptions, configServiceMock } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { HttpService } from '@kbn/core-http-server-internal';

const coreId = Symbol('core');
const env = Env.createDefault(REPO_ROOT, getEnvOptions());

const logger = loggingSystemMock.create();

const createConfigService = () => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation((path) => {
    if (path === 'server') {
      return new BehaviorSubject({
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
      } as any);
    }
    if (path === 'externalUrl') {
      return new BehaviorSubject({
        policy: [],
      } as any);
    }
    if (path === 'csp') {
      return new BehaviorSubject({
        strict: false,
        disableEmbedding: false,
        warnLegacyBrowsers: true,
      });
    }
    throw new Error(`Unexpected config path: ${path}`);
  });
  return configService;
};

const createDefaultContext = (): CoreContext => {
  return {
    coreId,
    env,
    logger,
    configService: createConfigService(),
  };
};

export const createCoreContext = (overrides: Partial<CoreContext> = {}): CoreContext => ({
  ...createDefaultContext(),
  ...overrides,
});

/**
 * Creates a concrete HttpServer with a mocked context.
 */
export const createHttpServer = (overrides: Partial<CoreContext> = {}): HttpService => {
  return new HttpService(createCoreContext(overrides));
};
