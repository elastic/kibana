/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, MockedFunction } from 'vitest';
export const setMetaMappingMigrationCompleteMock: Mock = vi.fn();
export const setMetaDocMigrationCompleteMock: Mock = vi.fn();
export const setMetaDocMigrationStartedMock: Mock = vi.fn();

vi.doMock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  const mockedModule = {
    ...actual,
    setMetaDocMigrationStarted: setMetaDocMigrationStartedMock,
    setMetaMappingMigrationComplete: setMetaMappingMigrationCompleteMock,
    setMetaDocMigrationComplete: setMetaDocMigrationCompleteMock,
  };
  return { ...mockedModule, default: mockedModule };
});

const realActions = await vi.importActual('./actions');

export const ActionMocks = Object.keys(realActions).reduce((mocks, key) => {
  mocks[key] = vi.fn().mockImplementation((state: unknown) => state);
  return mocks;
}, {} as Record<string, MockedFunction<any>>);

vi.doMock('./actions', () => ActionMocks);
