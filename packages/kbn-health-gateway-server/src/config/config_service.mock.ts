/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ConfigStart } from './config_service';
import { ConfigService } from './config_service';

const createStartMock = (): jest.Mocked<ConfigStart> => ({
  atPathSync: jest.fn(),
});

type ConfigServiceContract = PublicMethodsOf<ConfigService>;
const createMock = (): jest.Mocked<ConfigServiceContract> => {
  const service: jest.Mocked<ConfigServiceContract> = {
    setSchema: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  service.start.mockResolvedValue(createStartMock());

  return service;
};

export const configServiceMock = {
  create: createMock,
  createStartContract: createStartMock,
};
