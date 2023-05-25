/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  CommonHelper,
  EncryptionHelper,
  ValidationHelper,
  PreflightCheckHelper,
  SerializerHelper,
} from '../lib/apis/helpers';

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
  };

  return mock;
};

export interface RepositoryHelpersMock {
  common: CommonHelperMock;
  encryption: EncryptionHelperMock;
  validation: ValidationHelperMock;
  preflight: PreflightCheckHelperMock;
  serializer: SerializerHelperMock;
}

const createRepositoryHelpersMock = (): RepositoryHelpersMock => {
  return {
    common: createCommonHelperMock(),
    encryption: createEncryptionHelperMock(),
    validation: createValidationHelperMock(),
    preflight: createPreflightCheckHelperMock(),
    serializer: createSerializerHelperMock(),
  };
};

export const apiHelperMocks = {
  create: createRepositoryHelpersMock,
  createCommonHelper: createCommonHelperMock,
  createEncryptionHelper: createEncryptionHelperMock,
  createValidationHelper: createValidationHelperMock,
  createSerializerHelper: createSerializerHelperMock,
  createPreflightCheckHelper: createPreflightCheckHelperMock,
};
