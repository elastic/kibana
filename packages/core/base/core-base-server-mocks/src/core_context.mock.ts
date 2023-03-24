/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { Env, IConfigService } from '@kbn/config';
import type { LoggerFactory } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import { configServiceMock, getEnvOptions } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';

function create({
  env = Env.createDefault(REPO_ROOT, getEnvOptions()),
  logger = loggerMock.create(),
  configService = configServiceMock.create(),
}: {
  env?: Env;
  logger?: jest.Mocked<LoggerFactory>;
  configService?: jest.Mocked<IConfigService>;
} = {}): DeeplyMockedKeys<CoreContext> {
  return { coreId: Symbol(), env: env as DeeplyMockedKeys<typeof env>, logger, configService };
}

export const mockCoreContext = {
  create,
};
