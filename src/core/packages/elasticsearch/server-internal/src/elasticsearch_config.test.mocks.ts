/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const mockReadFileSync = vi.fn();
vi.mock('fs', () => {
  const mocked = {
    ...require('fs'),
    readFileSync: mockReadFileSync,
  };
  return { ...mocked, default: mocked };
});

export const mockReadPkcs12Keystore = vi.fn();
export const mockReadPkcs12Truststore = vi.fn();
vi.mock('@kbn/crypto', () => {
  const mocked = {
    readPkcs12Keystore: mockReadPkcs12Keystore,
    readPkcs12Truststore: mockReadPkcs12Truststore,
  };
  return { ...mocked, default: mocked };
});
