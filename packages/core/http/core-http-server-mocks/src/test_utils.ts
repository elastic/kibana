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
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  type HttpConfigType,
  type ExternalUrlConfigType,
  type CspConfigType,
  HttpService,
  config,
} from '@kbn/core-http-server-internal';

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
