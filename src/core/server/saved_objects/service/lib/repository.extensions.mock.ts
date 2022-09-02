/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ISavedObjectsEncryptionExtension } from '../../..';

const create = () => {
  const mock: jest.Mocked<ISavedObjectsEncryptionExtension> = {
    isEncryptableType: jest.fn(),
    decryptOrStripResponseAttributes: jest.fn(),
    encryptAttributes: jest.fn(),
  };

  return mock;
};

export const savedObjectsEncryptionExtensionMock = { create };
