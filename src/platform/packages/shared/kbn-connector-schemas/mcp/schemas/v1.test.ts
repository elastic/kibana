/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  MCPConnectorConfigSchema,
  MCPConnectorSecretsSchema,
  MCPAuthType,
  TestConnectorRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from './v1';

describe('MCP Schema', () => {
  describe('MCPAuthType', () => {
    it('has correct values', () => {
      expect(MCPAuthType.None).toBe('none');
      expect(MCPAuthType.Bearer).toBe('bearer');
      expect(MCPAuthType.ApiKey).toBe('apiKey');
      expect(MCPAuthType.Basic).toBe('basic');
    });
  });

  describe('MCPConnectorConfigSchema', () => {
    it('validates with required serverUrl', () => {
      expect(() =>
        MCPConnectorConfigSchema.parse({
          serverUrl: 'https://mcp.example.com',
        })
      ).not.toThrow();
    });

    it('applies default hasAuth to true', () => {
      const result = MCPConnectorConfigSchema.parse({
        serverUrl: 'https://mcp.example.com',
      });
      expect(result.hasAuth).toBe(true);
    });

    it('validates with all optional fields', () => {
      expect(() =>
        MCPConnectorConfigSchema.parse({
          serverUrl: 'https://mcp.example.com',
          hasAuth: true,
          authType: 'bearer',
          apiKeyHeaderName: 'X-Custom-API-Key',
          headers: { 'Content-Type': 'application/json' },
        })
      ).not.toThrow();
    });

    it('validates all auth types', () => {
      const authTypes = ['none', 'bearer', 'apiKey', 'basic'];
      authTypes.forEach((authType) => {
        expect(() =>
          MCPConnectorConfigSchema.parse({
            serverUrl: 'https://mcp.example.com',
            authType,
          })
        ).not.toThrow();
      });
    });

    it('throws on invalid auth type', () => {
      expect(() =>
        MCPConnectorConfigSchema.parse({
          serverUrl: 'https://mcp.example.com',
          authType: 'invalid',
        })
      ).toThrow();
    });

    it('throws when serverUrl is missing', () => {
      expect(() => MCPConnectorConfigSchema.parse({})).toThrow();
    });

    it('throws on empty apiKeyHeaderName', () => {
      expect(() =>
        MCPConnectorConfigSchema.parse({
          serverUrl: 'https://mcp.example.com',
          apiKeyHeaderName: '',
        })
      ).toThrow();
    });
  });

  describe('MCPConnectorSecretsSchema', () => {
    it('validates empty object', () => {
      expect(() => MCPConnectorSecretsSchema.parse({})).not.toThrow();
    });

    it('validates with bearer token', () => {
      expect(() =>
        MCPConnectorSecretsSchema.parse({
          token: 'bearer-token-123',
        })
      ).not.toThrow();
    });

    it('validates with api key', () => {
      expect(() =>
        MCPConnectorSecretsSchema.parse({
          apiKey: 'api-key-123',
        })
      ).not.toThrow();
    });

    it('validates with basic auth credentials', () => {
      expect(() =>
        MCPConnectorSecretsSchema.parse({
          user: 'username',
          password: 'password',
        })
      ).not.toThrow();
    });

    it('validates with secret headers', () => {
      expect(() =>
        MCPConnectorSecretsSchema.parse({
          secretHeaders: { Authorization: 'Bearer token' },
        })
      ).not.toThrow();
    });

    it('validates with all fields', () => {
      expect(() =>
        MCPConnectorSecretsSchema.parse({
          token: 'bearer-token',
          apiKey: 'api-key',
          user: 'username',
          password: 'password',
          secretHeaders: { 'X-Secret': 'value' },
        })
      ).not.toThrow();
    });
  });

  describe('TestConnectorRequestSchema', () => {
    it('validates empty object', () => {
      expect(() => TestConnectorRequestSchema.parse({})).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TestConnectorRequestSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ListToolsRequestSchema', () => {
    it('validates empty object', () => {
      expect(() => ListToolsRequestSchema.parse({})).not.toThrow();
    });

    it('validates with forceRefresh', () => {
      expect(() =>
        ListToolsRequestSchema.parse({
          forceRefresh: true,
        })
      ).not.toThrow();

      expect(() =>
        ListToolsRequestSchema.parse({
          forceRefresh: false,
        })
      ).not.toThrow();
    });
  });

  describe('CallToolRequestSchema', () => {
    it('validates with required name', () => {
      expect(() =>
        CallToolRequestSchema.parse({
          name: 'my-tool',
        })
      ).not.toThrow();
    });

    it('validates with optional arguments', () => {
      expect(() =>
        CallToolRequestSchema.parse({
          name: 'my-tool',
          arguments: { param1: 'value1', param2: 123 },
        })
      ).not.toThrow();
    });

    it('throws when name is missing', () => {
      expect(() => CallToolRequestSchema.parse({})).toThrow();
    });

    it('validates arguments with various types', () => {
      expect(() =>
        CallToolRequestSchema.parse({
          name: 'my-tool',
          arguments: {
            string: 'value',
            number: 123,
            boolean: true,
            null: null,
            array: [1, 2, 3],
            nested: { key: 'value' },
          },
        })
      ).not.toThrow();
    });
  });
});
