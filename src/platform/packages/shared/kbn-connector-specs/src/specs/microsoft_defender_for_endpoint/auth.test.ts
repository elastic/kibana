/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthTypeDef } from '../../connector_spec';
import { getSchemaForAuthType } from '../../lib/get_schema_for_auth_type';
import { mdeAuth, MdeConfigSchema } from './auth';

describe('Microsoft Defender for Endpoint auth and config', () => {
  const authTypes = mdeAuth.types as AuthTypeDef[];
  const byType = (type: string) => {
    const def = authTypes.find((t) => t.type === type);
    if (!def) {
      throw new Error(`auth type ${type} missing`);
    }
    return getSchemaForAuthType(def).schema;
  };

  it('offers client secret and certificate (private key JWT) app auth', () => {
    expect(authTypes.map((t) => t.type)).toEqual([
      'oauth_client_credentials',
      'oauth_client_credentials_private_key_jwt',
    ]);
  });

  it('requires a scope and never defaults it, since it depends on the cloud', () => {
    for (const type of ['oauth_client_credentials', 'oauth_client_credentials_private_key_jwt']) {
      expect(authTypes.find((t) => t.type === type)?.defaults).not.toHaveProperty('scope');
      const result = byType(type).safeParse({
        authType: type,
        tokenUrl: 'https://login.microsoftonline.com/t/oauth2/v2.0/token',
        clientId: 'c',
        clientSecret: 's',
        privateKey: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['scope']);
    }
  });

  it('signs the certificate assertion with PS256 and x5t#S256, hidden', () => {
    const def = authTypes.find((t) => t.type === 'oauth_client_credentials_private_key_jwt');
    expect(def?.defaults).toEqual({ algorithm: 'PS256', certificateBinding: 'x5t#S256' });
    expect(def?.overrides?.meta?.algorithm).toEqual({ hidden: true });
    expect(def?.overrides?.meta?.certificateBinding).toEqual({ hidden: true });
  });

  it('defaults the cloud to commercial and leaves the API URL empty', () => {
    const config = MdeConfigSchema.parse({});
    expect(config).toEqual({ cloud: 'commercial' });
    expect(() => MdeConfigSchema.parse({ cloud: 'moon' })).toThrow();
  });

  it('requires https for a custom API URL, except for localhost', () => {
    expect(MdeConfigSchema.safeParse({ apiUrl: 'https://proxy.example.com/api' }).success).toBe(
      true
    );
    expect(MdeConfigSchema.safeParse({ apiUrl: 'http://localhost:18080/api' }).success).toBe(true);

    const result = MdeConfigSchema.safeParse({ apiUrl: 'http://api.security.microsoft.com/api' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/must use https/);
  });
});
