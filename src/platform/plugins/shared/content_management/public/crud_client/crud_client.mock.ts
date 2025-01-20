/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CrudClient } from './crud_client';

export const createCrudClientMock = (): jest.Mocked<CrudClient> => {
  const mock: jest.Mocked<CrudClient> = {
    get: jest.fn((input) => Promise.resolve({} as any)),
    create: jest.fn((input) => Promise.resolve({} as any)),
    update: jest.fn((input) => Promise.resolve({} as any)),
    delete: jest.fn((input) => Promise.resolve({} as any)),
    search: jest.fn((input) => Promise.resolve({ hits: [] } as any)),
    mSearch: jest.fn((input) => Promise.resolve({ hits: [] } as any)),
  };
  return mock;
};
