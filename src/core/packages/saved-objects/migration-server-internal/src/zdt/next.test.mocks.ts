/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const setMetaMappingMigrationCompleteMock = jest.fn();
export const setMetaDocMigrationCompleteMock = jest.fn();
export const setMetaDocMigrationStartedMock = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    setMetaDocMigrationStarted: setMetaDocMigrationStartedMock,
    setMetaMappingMigrationComplete: setMetaMappingMigrationCompleteMock,
    setMetaDocMigrationComplete: setMetaDocMigrationCompleteMock,
  };
});

const realActions = jest.requireActual('./actions');

export const ActionMocks = Object.keys(realActions).reduce((mocks, key) => {
  mocks[key] = jest.fn().mockImplementation((state: unknown) => state);
  return mocks;
}, {} as Record<string, jest.MockedFunction<any>>);

jest.doMock('./actions', () => ActionMocks);
