/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, Mocked } from 'vitest';
import type { SavedObject } from '@kbn/core-saved-objects-server';
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

export type MigrationHelperMock = Mocked<PublicMethodsOf<MigrationHelper>>;

const createMigrationHelperMock = (): MigrationHelperMock => {
  const mock: MigrationHelperMock = {
    migrateInputDocument: vi.fn(),
    migrateStorageDocument: vi.fn(),
    migrateAndDecryptStorageDocument: vi.fn() as Mock,
  };

  mock.migrateInputDocument.mockImplementation((doc) => doc);
  mock.migrateStorageDocument.mockImplementation((doc) => doc);
  mock.migrateAndDecryptStorageDocument.mockImplementation(({ document }) =>
    Promise.resolve(document as SavedObject)
  );

  return mock;
};

export type CommonHelperMock = Mocked<PublicMethodsOf<CommonHelper>>;

const createCommonHelperMock = (): CommonHelperMock => {
  const mock: CommonHelperMock = {
    createPointInTimeFinder: vi.fn() as Mock,
    getIndexForType: vi.fn(),
    getIndicesForTypes: vi.fn(),
    getCurrentNamespace: vi.fn(),
    getValidId: vi.fn(),
  };

  mock.getIndexForType.mockReturnValue('.kibana_mock');
  mock.getIndicesForTypes.mockReturnValue(['.kibana_mock']);
  mock.getCurrentNamespace.mockImplementation((space) => space ?? 'default');
  mock.getValidId.mockReturnValue('valid-id');

  return mock;
};

export type EncryptionHelperMock = Mocked<PublicMethodsOf<EncryptionHelper>>;

const createEncryptionHelperMock = (): EncryptionHelperMock => {
  const mock: EncryptionHelperMock = {
    optionallyEncryptAttributes: vi.fn() as Mock,
    optionallyDecryptAndRedactSingleResult: vi.fn() as Mock,
    optionallyDecryptAndRedactBulkResult: vi.fn() as Mock,
  };

  return mock;
};

export type ValidationHelperMock = Mocked<PublicMethodsOf<ValidationHelper>>;

const createValidationHelperMock = (): ValidationHelperMock => {
  const mock: ValidationHelperMock = {
    validateInitialNamespaces: vi.fn(),
    validateObjectNamespaces: vi.fn(),
    validateObjectForCreate: vi.fn(),
    validateObjectForUpdate: vi.fn(),
    validateOriginId: vi.fn(),
  };

  return mock;
};

export type SerializerHelperMock = Mocked<PublicMethodsOf<SerializerHelper>>;

const createSerializerHelperMock = (): SerializerHelperMock => {
  const mock: SerializerHelperMock = {
    rawToSavedObject: vi.fn() as Mock,
  };

  return mock;
};

export type PreflightCheckHelperMock = Mocked<PublicMethodsOf<PreflightCheckHelper>>;

const createPreflightCheckHelperMock = (): PreflightCheckHelperMock => {
  const mock: PreflightCheckHelperMock = {
    preflightCheckForCreate: vi.fn(),
    preflightCheckForBulkDelete: vi.fn(),
    preflightCheckNamespaces: vi.fn(),
    preflightCheckForUpsertAliasConflict: vi.fn(),
    preflightGetDocForUpdate: vi.fn(),
    preflightCheckNamespacesForUpdate: vi.fn(),
  };

  return mock;
};

export type UserHelperMock = Mocked<PublicMethodsOf<UserHelper>>;

const createUserHelperMock = (): UserHelperMock => {
  const mock: UserHelperMock = {
    getCurrentUserProfileUid: vi.fn(),
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
