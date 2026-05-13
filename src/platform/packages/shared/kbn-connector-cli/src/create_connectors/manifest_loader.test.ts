/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveManifestSecrets } from './manifest_loader';
import { vaultRead } from './vault';
import type { Manifest } from './types';

jest.mock('./vault');
const vaultReadMock = vaultRead as jest.MockedFunction<typeof vaultRead>;

describe('resolveManifestSecrets', () => {
  afterEach(() => jest.resetAllMocks());

  it('resolves static values directly', async () => {
    const manifest: Manifest = {
      spec_id: '.brave_search',
      name: 'Brave Search (testing)',
      auth_type: 'api_key_header',
      secrets: {
        headerField: { value: 'X-Subscription-Token' },
        apiKey: { vault: 'secret/path', field: 'api_key' },
      },
    };
    vaultReadMock.mockResolvedValue('my-api-key');

    const resolved = await resolveManifestSecrets(manifest);

    expect(resolved.secrets.headerField).toBe('X-Subscription-Token');
    expect(resolved.secrets.apiKey).toBe('my-api-key');
    expect(resolved.secrets.authType).toBe('api_key_header');
  });

  it('includes config from manifest with empty default', async () => {
    const manifest: Manifest = {
      spec_id: '.amazon_s3',
      name: 'Amazon S3 (testing)',
      auth_type: 'aws_credentials',
      config: { region: 'us-east-1' },
      secrets: {
        accessKeyId: { vault: 'secret/path', field: 'access-key-id' },
        secretAccessKey: { vault: 'secret/path', field: 'secret-key' },
      },
    };
    vaultReadMock.mockResolvedValueOnce('AKID').mockResolvedValueOnce('SECRET');

    const resolved = await resolveManifestSecrets(manifest);

    expect(resolved.config).toEqual({ region: 'us-east-1' });
    expect(resolved.secrets.accessKeyId).toBe('AKID');
    expect(resolved.secrets.secretAccessKey).toBe('SECRET');
    expect(resolved.secrets.authType).toBe('aws_credentials');
  });

  it('throws when a vault field has no vault path', async () => {
    const manifest: Manifest = {
      spec_id: '.test',
      name: 'Test',
      auth_type: 'bearer',
      secrets: {
        token: { field: 'token' },
      },
    };

    await expect(resolveManifestSecrets(manifest)).rejects.toThrow(
      /Secret "token".*must have either.*value.*or.*vault/
    );
  });
});
