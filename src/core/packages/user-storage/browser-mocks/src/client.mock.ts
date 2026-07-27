/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import { lazyObject } from '@kbn/lazy-object';
import type { IUserStorageClient } from '@kbn/core-user-storage-browser';

export const clientMock = (): jest.Mocked<IUserStorageClient> =>
  lazyObject({
    peek: jest.fn(),
    get: jest.fn(),
    get$: jest.fn().mockReturnValue(new Subject<unknown>()),
    set: jest.fn().mockImplementation((_key: string, value: unknown) => Promise.resolve(value)),
    remove: jest.fn().mockResolvedValue(undefined),
    getUpdate$: jest.fn().mockReturnValue(new Subject<unknown>()),
    getHttpError$: jest.fn().mockReturnValue(new Subject<Error>()),
  });
