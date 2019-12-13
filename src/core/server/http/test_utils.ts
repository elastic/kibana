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

import { BehaviorSubject } from 'rxjs';
import { ByteSizeValue } from '@kbn/config-schema';
import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { HttpService } from './http_service';
import { CoreContext } from '../core_context';
import { configServiceMock } from '../config/config_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';

const coreId = Symbol('core');
const env = Env.createDefault(getEnvOptions());

const logger = loggingServiceMock.create();

const configService = configServiceMock.create();
configService.atPath.mockReturnValue(
  new BehaviorSubject({
    hosts: ['localhost'],
    maxPayload: new ByteSizeValue(1024),
    autoListen: true,
    ssl: {
      enabled: false,
    },
    compression: { enabled: true },
  } as any)
);

const defaultContext: CoreContext = {
  coreId,
  env,
  logger,
  configService,
};

/**
 * Creates a concrete HttpServer with a mocked context.
 */
export const createHttpServer = (overrides: Partial<CoreContext> = {}): HttpService => {
  const context = {
    ...defaultContext,
    ...overrides,
  };
  return new HttpService(context);
};
