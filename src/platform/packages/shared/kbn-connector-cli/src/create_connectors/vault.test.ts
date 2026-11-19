/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import { vaultRead } from './vault';

jest.mock('execa');
const execaMock = execa as unknown as jest.MockedFunction<typeof execa>;

describe('vaultRead', () => {
  let originalVaultAddr: string | undefined;

  beforeEach(() => {
    originalVaultAddr = process.env.VAULT_ADDR;
    delete process.env.VAULT_ADDR;
  });

  afterEach(() => {
    jest.resetAllMocks();
    if (originalVaultAddr !== undefined) {
      process.env.VAULT_ADDR = originalVaultAddr;
    } else {
      delete process.env.VAULT_ADDR;
    }
  });

  it('calls vault CLI with correct arguments and returns trimmed output', async () => {
    execaMock.mockResolvedValue({ stdout: '  my-secret-value\n' } as any);

    const result = await vaultRead('secret/my/path', 'my-field');

    expect(execaMock).toHaveBeenCalledWith(
      'vault',
      ['read', '-field', 'my-field', 'secret/my/path'],
      { env: { VAULT_ADDR: 'https://secrets.elastic.co:8200' } }
    );
    expect(result).toBe('my-secret-value');
  });

  it('uses VAULT_ADDR env var when set', async () => {
    process.env.VAULT_ADDR = 'https://custom-vault:8200';
    execaMock.mockResolvedValue({ stdout: 'val' } as any);

    await vaultRead('secret/path', 'field');

    expect(execaMock).toHaveBeenCalledWith('vault', ['read', '-field', 'field', 'secret/path'], {
      env: { VAULT_ADDR: 'https://custom-vault:8200' },
    });
  });

  it('throws a descriptive error when vault CLI fails', async () => {
    const error: any = new Error('command failed');
    error.stderr = 'permission denied';
    execaMock.mockRejectedValue(error);

    await expect(vaultRead('secret/path', 'field')).rejects.toThrow(
      /Failed to read secret from vault/
    );
  });

  it('throws when vault returns empty output', async () => {
    execaMock.mockResolvedValue({ stdout: '   \n' } as any);

    await expect(vaultRead('secret/path', 'field')).rejects.toThrow(
      /Vault returned an empty value/
    );
  });
});
