/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VAULT_APPROLE_AUTH_ID, VaultAppRoleAuth } from './vault_approle';

describe('VaultAppRoleAuth (definition)', () => {
  it('has the expected id and authMode', () => {
    expect(VaultAppRoleAuth.id).toBe('vault_approle');
    expect(VaultAppRoleAuth.id).toBe(VAULT_APPROLE_AUTH_ID);
    expect(VaultAppRoleAuth.authMode).toBe('shared');
  });

  it('exposes address, namespace, mountPath, roleId, secretId fields', () => {
    const shape = (VaultAppRoleAuth.schema as { shape: Record<string, unknown> }).shape;
    expect(Object.keys(shape).sort()).toEqual(
      ['address', 'namespace', 'mountPath', 'roleId', 'secretId'].sort()
    );
  });

  it('defaults mountPath to "approle"', () => {
    const parsed = VaultAppRoleAuth.schema.parse({
      address: 'https://vault.example.com:8200',
      roleId: 'role-id',
      secretId: 'secret-id',
    });
    expect((parsed as { mountPath: string }).mountPath).toBe('approle');
  });

  it('requires roleId and secretId', () => {
    expect(() =>
      VaultAppRoleAuth.schema.parse({
        address: 'https://vault.example.com:8200',
        roleId: '',
        secretId: '',
      })
    ).toThrow();
  });

  it('marks secretId as sensitive metadata', () => {
    const shape = (
      VaultAppRoleAuth.schema as { shape: Record<string, { meta: () => Record<string, unknown> }> }
    ).shape;
    expect(shape.secretId.meta()).toMatchObject({ sensitive: true });
  });
});
