/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { readTenantsFile } from './tenants_file';

const keys = `encryptionKey: ${'b'.repeat(32)}, securityEncryptionKey: ${'B'.repeat(32)}`;

describe('readTenantsFile', () => {
  let dir: string;
  const read = async (contents: string) => {
    const path = join(dir, 'tenants.yml');
    await writeFile(path, contents);
    return readTenantsFile(path);
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tenants-file-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads tenants with both encryption keys', async () => {
    await expect(
      read(`project-b: { hosts: ['http://localhost:9201'], serviceAccountToken: token, ${keys} }`)
    ).resolves.toEqual({
      'project-b': {
        hosts: ['http://localhost:9201'],
        serviceAccountToken: 'token',
        encryptionKey: 'b'.repeat(32),
        securityEncryptionKey: 'B'.repeat(32),
      },
    });
  });

  it.each(['encryptionKey', 'securityEncryptionKey'])('requires %s', async (key) => {
    const withoutKey = keys
      .split(', ')
      .filter((entry) => !entry.startsWith(`${key}:`))
      .join(', ');

    await expect(
      read(
        `project-b: { hosts: ['http://localhost:9201'], serviceAccountToken: token, ${withoutKey} }`
      )
    ).rejects.toThrow(key);
  });
});
