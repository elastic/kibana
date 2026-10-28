/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import { buildHeadersFromSecrets, buildMcpAuthHeaders } from './auth_headers';

describe('buildHeadersFromSecrets', () => {
  const baseConfig: MCPConnectorConfig = {
    serverUrl: 'https://example.com',
    hasAuth: true,
  };
  const emptySecrets: MCPConnectorSecrets = {};

  it('returns empty headers when hasAuth is false', () => {
    expect(buildHeadersFromSecrets(emptySecrets, { ...baseConfig, hasAuth: false })).toEqual({});
  });

  it('returns empty headers when authType is none', () => {
    expect(
      buildHeadersFromSecrets(emptySecrets, { ...baseConfig, authType: MCPAuthType.None })
    ).toEqual({});
  });

  it('returns a bearer Authorization header when a token is set', () => {
    expect(
      buildHeadersFromSecrets(
        { token: 'test-token-123' },
        { ...baseConfig, authType: MCPAuthType.Bearer }
      )
    ).toEqual({ Authorization: 'Bearer test-token-123' });
  });

  it('returns empty headers when the bearer token is missing or empty', () => {
    const config = { ...baseConfig, authType: MCPAuthType.Bearer };
    expect(buildHeadersFromSecrets(emptySecrets, config)).toEqual({});
    expect(buildHeadersFromSecrets({ token: '' }, config)).toEqual({});
  });

  it('uses X-API-Key by default for apiKey auth', () => {
    expect(
      buildHeadersFromSecrets(
        { apiKey: 'test-api-key-456' },
        { ...baseConfig, authType: MCPAuthType.ApiKey }
      )
    ).toEqual({ 'X-API-Key': 'test-api-key-456' });
  });

  it('uses a custom api key header name', () => {
    expect(
      buildHeadersFromSecrets(
        { apiKey: 'test-api-key-789' },
        {
          ...baseConfig,
          authType: MCPAuthType.ApiKey,
          apiKeyHeaderName: 'X-Custom-API-Key',
        }
      )
    ).toEqual({ 'X-Custom-API-Key': 'test-api-key-789' });
  });

  it('replaces the {{apiKey}} template', () => {
    expect(
      buildHeadersFromSecrets(
        { apiKey: 'pagerduty-token-abc' },
        {
          ...baseConfig,
          authType: MCPAuthType.ApiKey,
          apiKeyHeaderName: 'Authorization',
          apiKeyHeaderValue: 'Token token={{apiKey}}',
        }
      )
    ).toEqual({ Authorization: 'Token token=pagerduty-token-abc' });
  });

  it('returns empty headers when the api key is missing', () => {
    expect(
      buildHeadersFromSecrets(emptySecrets, { ...baseConfig, authType: MCPAuthType.ApiKey })
    ).toEqual({});
  });

  it('returns a basic Authorization header', () => {
    const expected = Buffer.from('testuser:testpass').toString('base64');
    expect(
      buildHeadersFromSecrets(
        { user: 'testuser', password: 'testpass' },
        { ...baseConfig, authType: MCPAuthType.Basic }
      )
    ).toEqual({ Authorization: `Basic ${expected}` });
  });

  it('encodes special characters in basic credentials', () => {
    const expected = Buffer.from('user@example.com:p@ss:w0rd!').toString('base64');
    expect(
      buildHeadersFromSecrets(
        { user: 'user@example.com', password: 'p@ss:w0rd!' },
        { ...baseConfig, authType: MCPAuthType.Basic }
      )
    ).toEqual({ Authorization: `Basic ${expected}` });
  });

  it('returns empty headers when basic user or password is missing or empty', () => {
    const config = { ...baseConfig, authType: MCPAuthType.Basic };
    expect(buildHeadersFromSecrets({ password: 'testpass' }, config)).toEqual({});
    expect(buildHeadersFromSecrets({ user: 'testuser' }, config)).toEqual({});
    expect(buildHeadersFromSecrets({ user: '', password: '' }, config)).toEqual({});
  });

  it('includes secret headers and merges them over auth headers', () => {
    expect(
      buildHeadersFromSecrets(
        { secretHeaders: { 'X-Custom-Header-1': 'value1', 'X-Custom-Header-2': 'value2' } },
        baseConfig
      )
    ).toEqual({ 'X-Custom-Header-1': 'value1', 'X-Custom-Header-2': 'value2' });

    expect(
      buildHeadersFromSecrets(
        { token: 'my-token', secretHeaders: { 'X-Extra-Header': 'extra-value' } },
        { ...baseConfig, authType: MCPAuthType.Bearer }
      )
    ).toEqual({ Authorization: 'Bearer my-token', 'X-Extra-Header': 'extra-value' });
  });

  it('includes secret headers when authType is unset', () => {
    expect(buildHeadersFromSecrets({ secretHeaders: { 'X-Header': 'value' } }, baseConfig)).toEqual(
      {
        'X-Header': 'value',
      }
    );
    expect(buildHeadersFromSecrets({ secretHeaders: {} }, baseConfig)).toEqual({});
  });
});

describe('buildMcpAuthHeaders', () => {
  const config: MCPConnectorConfig = {
    serverUrl: 'https://example.com',
    hasAuth: true,
    authType: MCPAuthType.Bearer,
    headers: {
      Authorization: 'from-config',
      'X-Custom': 'from-config',
    },
  };

  it('lets auth headers override config headers', async () => {
    await expect(buildMcpAuthHeaders(config, { token: 'secret' })).resolves.toEqual({
      Authorization: 'Bearer secret',
      'X-Custom': 'from-config',
    });
  });

  it('lets a secret header override both config and auth headers', async () => {
    await expect(
      buildMcpAuthHeaders(config, {
        token: 'secret',
        secretHeaders: { Authorization: 'from-secret', 'X-Secret': 'secret' },
      })
    ).resolves.toEqual({
      Authorization: 'from-secret',
      'X-Custom': 'from-config',
      'X-Secret': 'secret',
    });
  });
});
