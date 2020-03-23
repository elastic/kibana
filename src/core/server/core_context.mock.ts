/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreContext } from './core_context';
import { getEnvOptions } from './config/__mocks__/env';
import { Env, IConfigService } from './config';
import { loggingServiceMock } from './logging/logging_service.mock';
import { configServiceMock } from './config/config_service.mock';
import { ILoggingService } from './logging';

function create({
  env = Env.createDefault(getEnvOptions()),
  logger = loggingServiceMock.create(),
  configService = configServiceMock.create(),
}: {
  env?: Env;
  logger?: jest.Mocked<ILoggingService>;
  configService?: jest.Mocked<IConfigService>;
} = {}): DeeplyMockedKeys<CoreContext> {
  return { coreId: Symbol(), env, logger, configService };
}

export const mockCoreContext = {
  create,
};
