/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { APIKeysType } from '@kbn/core-security-server';
import { lazyObject } from '@kbn/lazy-object';

export const apiKeysMock = {
  create: (): jest.MockedObjectDeep<APIKeysType> =>
    lazyObject({
      areAPIKeysEnabled: jest.fn(),
      areCrossClusterAPIKeysEnabled: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      grantAsInternalUser: jest.fn(),
      validate: jest.fn(),
      invalidate: jest.fn(),
      invalidateAsInternalUser: jest.fn(),
      uiam: {
        grant: jest.fn(),
        invalidate: jest.fn(),
      },
    }),
};
