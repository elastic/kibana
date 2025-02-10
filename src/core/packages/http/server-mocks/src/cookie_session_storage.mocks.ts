/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SessionStorageFactory, SessionStorage } from '@kbn/core-http-server';

const createSessionStorageMock = <T>(): jest.Mocked<SessionStorage<T>> => ({
  get: jest.fn().mockResolvedValue({}),
  set: jest.fn(),
  clear: jest.fn(),
});

type ReturnMocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => infer U
    ? (...args: any[]) => jest.Mocked<U>
    : T[K];
};

type DeepMocked<T> = jest.Mocked<ReturnMocked<T>>;

const creatSessionStorageFactoryMock = <T extends object>() => {
  const mocked: DeepMocked<SessionStorageFactory<T>> = {
    asScoped: jest.fn(),
  };
  mocked.asScoped.mockImplementation(createSessionStorageMock);
  return mocked;
};

export const sessionStorageMock = {
  create: createSessionStorageMock,
  createFactory: creatSessionStorageFactoryMock,
};
