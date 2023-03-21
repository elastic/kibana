/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ServerStart } from './server';
import { Server } from './server';

const createStartMock = (): jest.Mocked<ServerStart> => ({
  addRoute: jest.fn(),
});

type ServerContract = PublicMethodsOf<Server>;
const createMock = (): jest.Mocked<ServerContract> => {
  const service: jest.Mocked<ServerContract> = {
    start: jest.fn(),
    stop: jest.fn(),
  };

  service.start.mockResolvedValue(createStartMock());

  return service;
};

export const serverMock = {
  create: createMock,
  createStartContract: createStartMock,
};
