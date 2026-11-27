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

  it('requires https for the token URL in both auth types, except for localhost', () => {
    const secretsFor = (type: string, tokenUrl: string) => ({
      authType: type,
      tokenUrl,
      clientId: 'c',
      clientSecret: 's',
      scope: 'https://api.securitycenter.microsoft.com/.default',
      privateKey: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----',
      certificate: '-----BEGIN CERTIFICATE-----\nx\n-----END CERTIFICATE-----',
    });
    for (const type of ['oauth_client_credentials', 'oauth_client_credentials_private_key_jwt']) {
      const schema = byType(type);
      const tokenUrlIssues = (tokenUrl: string) =>
        (schema.safeParse(secretsFor(type, tokenUrl)).error?.issues ?? []).filter(
          (issue) => issue.path[0] === 'tokenUrl'
        );

      expect(tokenUrlIssues('https://login.microsoftonline.com/t/oauth2/v2.0/token')).toEqual([]);
      expect(tokenUrlIssues('http://localhost:18080/t/oauth2/v2.0/token')).toEqual([]);

      const issues = tokenUrlIssues('http://login.microsoftonline.com/t/oauth2/v2.0/token');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toMatch(/token URL must use https/);
      // The override keeps the inherited label and allowed-hosts validation.
      expect(schema.shape.tokenUrl.meta()).toMatchObject({ validate: { allowedHosts: true } });
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

  it('rejects a custom API URL with a query string or fragment', () => {
    for (const apiUrl of [
      'https://proxy.example.com/api?tenant=a',
      'https://proxy.example.com/api?',
      'https://proxy.example.com/api#frag',
    ]) {
      const result = MdeConfigSchema.safeParse({ apiUrl });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/query string or fragment/);
    }
  });
});
