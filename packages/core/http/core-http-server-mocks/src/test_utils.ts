/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Env } from '@kbn/config';
import { configServiceMock, getEnvOptions } from '@kbn/config-mocks';
import { ByteSizeValue } from '@kbn/config-schema';
import type { CoreContext } from '@kbn/core-base-server-internal';
import {
  type CspConfigType,
  type ExternalUrlConfigType,
  type HttpConfigType,
  HttpService,
  config,
} from '@kbn/core-http-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { REPO_ROOT } from '@kbn/repo-info';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';

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
            restrictInternalApis: false,
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
 * Creates a concrete HttpService with a mocked context.
 */
export const createHttpService = ({
  buildNum,
  ...overrides
}: Partial<CoreContext & { buildNum: number }> = {}): HttpService => {
  const ctx = createCoreContext(overrides);
  if (buildNum !== undefined) {
    ctx.env = {
      ...ctx.env,
      packageInfo: {
        ...ctx.env.packageInfo,
        buildNum,
      },
    };
  }
  return new HttpService(ctx);
};
