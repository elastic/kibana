/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

const DEFAULT_VAULT_ADDR = 'https://secrets.elastic.co:8200';

/**
 * Reads a single field from a Vault secret path using the vault CLI.
 * Requires `vault login --method oidc` to have been run beforehand.
 */
export async function vaultRead(path: string, field: string): Promise<string> {
  const vaultAddr = process.env.VAULT_ADDR || DEFAULT_VAULT_ADDR;

  let stdout: string;
  try {
    ({ stdout } = await execa('vault', ['read', '-field', field, path], {
      env: { VAULT_ADDR: vaultAddr },
    }));
  } catch (error: any) {
    const vaultStderr = error.stderr?.trim() ?? '';
    const parts = [
      `Failed to read secret from vault (path: ${path}, field: ${field}).`,
      ...(vaultStderr ? [`Vault output: ${vaultStderr}`] : []),
      '',
      'Make sure you are logged in:',
      '',
      `  VAULT_ADDR=${vaultAddr} vault login --method oidc`,
    ];
    throw new Error(parts.join('\n'));
  }

  const value = stdout.trim();
  if (!value) {
    throw new Error(`Vault returned an empty value for path: ${path}, field: ${field}`);
  }

  return value;
}
