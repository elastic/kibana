/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { UserContentPluginStart } from './types';

function createUserContentStartMock(): UserContentPluginStart {
  const mock: UserContentPluginStart = {
    ui: {
      getUserContentTableColumnsDefinitions: jest.fn().mockResolvedValue([]),
    },
    getUserContentTypes: jest.fn().mockResolvedValue([]),
    events: {
      register: jest.fn(),
      bulkRegister: jest.fn(),
    },
  };

  return mock;
}

export const userContentMock = {
  createStart: createUserContentStartMock,
};
