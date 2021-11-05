/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import type fs from 'fs';
import { X509Certificate } from 'crypto';

export const mockReadFileSync = jest.fn((p: string) => TEST_CA);
jest.mock('fs', () => ({ readFileSync: mockReadFileSync }));

export const TEST_CA = jest
  .requireActual<typeof fs>('fs')
  .readFileSync(path.join(__dirname, '__fixtures__', 'test_ca.crt'), 'utf-8');

export const TEST_X509 = new X509Certificate(TEST_CA);

export const mockReadPkcs12Keystore = jest.fn(
  (p: string) =>
    ({
      key: `content-of-${p}.key`,
      cert: TEST_CA,
      ca: [TEST_CA],
    } as any)
);

export const mockReadPkcs12Truststore = jest.fn().mockReturnValue([TEST_CA]);

jest.mock('@kbn/crypto', () => ({
  readPkcs12Keystore: mockReadPkcs12Keystore,
  readPkcs12Truststore: mockReadPkcs12Truststore,
}));
