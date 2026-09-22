/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

import { isShallowRepository } from './is_shallow_repository';

jest.mock('execa');

const mockExeca = execa as unknown as jest.Mock;

describe('isShallowRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for shallow repositories', async () => {
    mockExeca.mockResolvedValue({ stdout: 'true' });

    await expect(isShallowRepository()).resolves.toBe(true);
  });

  it('returns false for full repositories', async () => {
    mockExeca.mockResolvedValue({ stdout: 'false' });

    await expect(isShallowRepository()).resolves.toBe(false);
  });

  it('returns false when the Git probe fails', async () => {
    mockExeca.mockRejectedValue(new Error('git failed'));

    await expect(isShallowRepository()).resolves.toBe(false);
  });
});
