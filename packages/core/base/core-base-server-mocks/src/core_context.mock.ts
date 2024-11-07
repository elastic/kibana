/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { Env, IConfigService } from '@kbn/config';
import type { LoggerFactory } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import { configServiceMock, createTestEnv } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';

function create({
  env = createTestEnv(),
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
