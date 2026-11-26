/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, Mocked } from 'vitest';
import type { IEncryptionHelper } from '../lib/apis/helpers/encryption';

export type IEncryptionHelperMock = Mocked<IEncryptionHelper>;

export const createEncryptionHelperMock = (): IEncryptionHelperMock => {
  const mock: IEncryptionHelperMock = {
    optionallyEncryptAttributes: vi.fn() as Mock,
    optionallyDecryptAndRedactSingleResult: vi.fn() as Mock,
    optionallyDecryptAndRedactBulkResult: vi.fn() as Mock,
  };

  return mock;
};
