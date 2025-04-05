/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { type CoreContext } from '@kbn/core-base-server-internal';

import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

const getConfigService = () => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation((path) => {
    return new BehaviorSubject({});
  });
  return configService;
};

describe('UuidService', () => {
  let logger: ReturnType<typeof loggingSystemMock.create>;
  let configService: ReturnType<typeof configServiceMock.create>;
  let coreContext: CoreContext;

  beforeEach(async () => {
    logger = loggingSystemMock.create();
    configService = getConfigService();
    coreContext = mockCoreContext.create({ logger, configService });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
