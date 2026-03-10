/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

import { hasStagedChanges } from './has_staged_changes';

jest.mock('execa');
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

const mockExeca = execa as unknown as jest.Mock;

describe('hasStagedChanges', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('returns false when the index matches HEAD', async () => {
    mockExeca.mockResolvedValue({ stdout: '' });

    await expect(hasStagedChanges()).resolves.toBe(false);
  });

  it('returns true when git diff exits with status 1', async () => {
    mockExeca.mockRejectedValue({ exitCode: 1 });

    await expect(hasStagedChanges()).resolves.toBe(true);
  });

  it('rethrows unexpected git failures', async () => {
    const error = new Error('git failed');
    mockExeca.mockRejectedValue(error);

    await expect(hasStagedChanges()).rejects.toBe(error);
  });
});
