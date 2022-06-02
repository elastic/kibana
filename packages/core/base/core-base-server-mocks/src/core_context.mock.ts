/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { Env, IConfigService } from '@kbn/config';
import type { LoggerFactory } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import { configServiceMock, getEnvOptions } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';

// duplicated from '@kbn/utility-types/jest' until we can import it from packages
type DeeplyMockedKeys<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? jest.MockInstance<ReturnType<T[P]>, Parameters<T[P]>>
    : DeeplyMockedKeys<T[P]>;
} & T;

function create({
  env = Env.createDefault(REPO_ROOT, getEnvOptions()),
  logger = loggerMock.create(),
  configService = configServiceMock.create(),
}: {
  env?: Env;
  logger?: jest.Mocked<LoggerFactory>;
  configService?: jest.Mocked<IConfigService>;
} = {}): DeeplyMockedKeys<CoreContext> {
  return { coreId: Symbol(), env, logger, configService };
}

export const mockCoreContext = {
  create,
};
