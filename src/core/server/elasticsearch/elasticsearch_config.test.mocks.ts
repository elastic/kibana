/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const mockReadFileSync = jest.fn();
jest.mock('fs', () => ({ readFileSync: mockReadFileSync }));

export const mockReadPkcs12Keystore = jest.fn();
export const mockReadPkcs12Truststore = jest.fn();
jest.mock('../utils', () => ({
  readPkcs12Keystore: mockReadPkcs12Keystore,
  readPkcs12Truststore: mockReadPkcs12Truststore,
}));
