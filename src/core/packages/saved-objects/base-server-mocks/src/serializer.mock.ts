/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';

const createSerializerMock = () => {
  const mock: jest.Mocked<ISavedObjectsSerializer> = {
    isRawSavedObject: jest.fn(),
    rawToSavedObject: jest.fn(),
    savedObjectToRaw: jest.fn(),
    generateRawId: jest.fn(),
    generateRawLegacyUrlAliasId: jest.fn(),
  };
  return mock;
};

export const serializerMock = {
  create: createSerializerMock,
};
