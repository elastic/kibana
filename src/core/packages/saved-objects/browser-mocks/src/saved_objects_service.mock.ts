/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObjectsService } from '@kbn/core-saved-objects-browser-internal';
import type { SavedObjectsStart } from '@kbn/core-saved-objects-browser';
import { lazyObject } from '@kbn/lazy-object';

type SavedObjectsServiceContract = PublicMethodsOf<SavedObjectsService>;

const createStartContractMock = () => {
  const mock: jest.Mocked<SavedObjectsStart> = lazyObject({
    client: lazyObject({
      create: jest.fn(),
      bulkCreate: jest.fn(),
      bulkResolve: jest.fn(),
      bulkUpdate: jest.fn(),
      bulkDelete: jest.fn(),
      delete: jest.fn(),
      bulkGet: jest.fn(),
      find: jest.fn(),
      get: jest.fn(),
      resolve: jest.fn(),
      update: jest.fn(),
    }),
  });
  return mock;
};

const createMock = () => {
  const mocked: jest.Mocked<SavedObjectsServiceContract> = lazyObject({
    setup: jest.fn(),
    start: jest.fn().mockReturnValue(Promise.resolve(createStartContractMock())),
    stop: jest.fn(),
  });
  return mocked;
};

/**
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export const savedObjectsServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
