/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '@kbn/core-saved-objects-server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  CommonHelper,
  EncryptionHelper,
  ValidationHelper,
  PreflightCheckHelper,
  SerializerHelper,
  MigrationHelper,
  UserHelper,
} from '../lib/apis/helpers';

export type MigrationHelperMock = jest.Mocked<PublicMethodsOf<MigrationHelper>>;

const createMigrationHelperMock = (): MigrationHelperMock => {
  const mock: MigrationHelperMock = {
    migrateInputDocument: jest.fn(),
    migrateStorageDocument: jest.fn(),
    migrateAndDecryptStorageDocument: jest.fn(),
  };

  mock.migrateInputDocument.mockImplementation((doc) => doc);
  mock.migrateStorageDocument.mockImplementation((doc) => doc);
  mock.migrateAndDecryptStorageDocument.mockImplementation(({ document }) =>
    Promise.resolve(document as SavedObject)
  );

  return mock;
};

export type CommonHelperMock = jest.Mocked<PublicMethodsOf<CommonHelper>>;

const createCommonHelperMock = (): CommonHelperMock => {
  const mock: CommonHelperMock = {
    createPointInTimeFinder: jest.fn(),
    getIndexForType: jest.fn(),
    getIndicesForTypes: jest.fn(),
    getCurrentNamespace: jest.fn(),
    getValidId: jest.fn(),
  };

  mock.getIndexForType.mockReturnValue('.kibana_mock');
  mock.getIndicesForTypes.mockReturnValue(['.kibana_mock']);
  mock.getCurrentNamespace.mockImplementation((space) => space ?? 'default');
  mock.getValidId.mockReturnValue('valid-id');

  return mock;
};

export type EncryptionHelperMock = jest.Mocked<PublicMethodsOf<EncryptionHelper>>;

const createEncryptionHelperMock = (): EncryptionHelperMock => {
  const mock: EncryptionHelperMock = {
    optionallyEncryptAttributes: jest.fn(),
    optionallyDecryptAndRedactSingleResult: jest.fn(),
    optionallyDecryptAndRedactBulkResult: jest.fn(),
  };

  return mock;
};

export type ValidationHelperMock = jest.Mocked<PublicMethodsOf<ValidationHelper>>;

const createValidationHelperMock = (): ValidationHelperMock => {
  const mock: ValidationHelperMock = {
    validateInitialNamespaces: jest.fn(),
    validateObjectNamespaces: jest.fn(),
    validateObjectForCreate: jest.fn(),
    validateOriginId: jest.fn(),
  };

  return mock;
};

export type SerializerHelperMock = jest.Mocked<PublicMethodsOf<SerializerHelper>>;

const createSerializerHelperMock = (): SerializerHelperMock => {
  const mock: SerializerHelperMock = {
    rawToSavedObject: jest.fn(),
  };

  return mock;
};

export type PreflightCheckHelperMock = jest.Mocked<PublicMethodsOf<PreflightCheckHelper>>;

const createPreflightCheckHelperMock = (): PreflightCheckHelperMock => {
  const mock: PreflightCheckHelperMock = {
    preflightCheckForCreate: jest.fn(),
    preflightCheckForBulkDelete: jest.fn(),
    preflightCheckNamespaces: jest.fn(),
    preflightCheckForUpsertAliasConflict: jest.fn(),
    preflightGetDocForUpdate: jest.fn(),
    preflightCheckNamespacesForUpdate: jest.fn(),
  };

  return mock;
};

export type UserHelperMock = jest.Mocked<PublicMethodsOf<UserHelper>>;

const createUserHelperMock = (): UserHelperMock => {
  const mock: UserHelperMock = {
    getCurrentUserProfileUid: jest.fn(),
  };

  return mock;
};

export interface RepositoryHelpersMock {
  common: CommonHelperMock;
  encryption: EncryptionHelperMock;
  validation: ValidationHelperMock;
  preflight: PreflightCheckHelperMock;
  serializer: SerializerHelperMock;
  migration: MigrationHelperMock;
  user: UserHelperMock;
}

const createRepositoryHelpersMock = (): RepositoryHelpersMock => {
  return {
    common: createCommonHelperMock(),
    encryption: createEncryptionHelperMock(),
    validation: createValidationHelperMock(),
    preflight: createPreflightCheckHelperMock(),
    serializer: createSerializerHelperMock(),
    migration: createMigrationHelperMock(),
    user: createUserHelperMock(),
  };
};

export const apiHelperMocks = {
  create: createRepositoryHelpersMock,
  createCommonHelper: createCommonHelperMock,
  createEncryptionHelper: createEncryptionHelperMock,
  createValidationHelper: createValidationHelperMock,
  createSerializerHelper: createSerializerHelperMock,
  createPreflightCheckHelper: createPreflightCheckHelperMock,
  createMigrationHelper: createMigrationHelperMock,
};
