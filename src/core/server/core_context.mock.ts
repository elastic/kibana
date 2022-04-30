/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { CoreContext } from './core_context';
import { Env, IConfigService } from './config';
import { configServiceMock, getEnvOptions } from './config/mocks';
import { loggingSystemMock } from './logging/logging_system.mock';
import { ILoggingSystem } from './logging';

function create({
  env = Env.createDefault(REPO_ROOT, getEnvOptions()),
  logger = loggingSystemMock.create(),
  configService = configServiceMock.create(),
}: {
  env?: Env;
  logger?: jest.Mocked<ILoggingSystem>;
  configService?: jest.Mocked<IConfigService>;
} = {}): DeeplyMockedKeys<CoreContext> {
  return { coreId: Symbol(), env, logger, configService };
}

export const mockCoreContext = {
  create,
};
