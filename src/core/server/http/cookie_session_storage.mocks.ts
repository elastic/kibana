/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SessionStorageFactory, SessionStorage } from './session_storage';

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

const creatSessionStorageFactoryMock = <T>() => {
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
