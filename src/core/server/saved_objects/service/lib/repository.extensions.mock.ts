/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  ISavedObjectsEncryptionExtension,
  ISavedObjectsSpacesExtension,
  ISavedObjectsSecurityExtension,
} from '../../..';

const createEncryptionExt = () => {
  const mock: jest.Mocked<ISavedObjectsEncryptionExtension> = {
    isEncryptableType: jest.fn(),
    decryptOrStripResponseAttributes: jest.fn(),
    encryptAttributes: jest.fn(),
  };
  return mock;
};
export const savedObjectsEncryptionExtensionMock = { create: createEncryptionExt };

const createSpacesExt = () => {
  const mock: jest.Mocked<ISavedObjectsSpacesExtension> = {
    getCurrentNamespace: jest.fn(),
    getSearchableNamespaces: jest.fn(),
  };
  return mock;
};
export const savedObjectsSpacesExtensionMock = { create: createSpacesExt };

const createSecurityExt = () => {
  const mock: jest.Mocked<ISavedObjectsSecurityExtension> = {
    checkAuthorization: jest.fn(),
    enforceAuthorization: jest.fn(),
    addAuditEvent: jest.fn(),
    redactNamespaces: jest.fn(),
  };
  return mock;
};
export const savedObjectsSecurityExtensionMock = { create: createSecurityExt };
