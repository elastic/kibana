/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { GoogleDocsConnector } from './google_docs';

// Mock withMcpClient so action handlers don't need a real MCP transport.
const mockCallTool = jest.fn();
const mockListTools = jest.fn();

jest.mock('../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

// Helper: parse raw input through the action schema the way the framework does,
// so Zod defaults are applied before the handler receives the input.
const parse = <K extends keyof typeof GoogleDocsConnector.actions>(
  action: K,
  raw: Record<string, unknown>
) => GoogleDocsConnector.actions[action].input.parse(raw);

describe('GoogleDocsConnector', () => {
  const mockContext = {
    client: {},
    log: {},
    config: { serverUrl: 'https://docsmcp.googleapis.com/mcp/v1' },
  } as unknown as ActionContext;

  const mockJson = { documentId: 'doc-1', title: 'My Document', body: { content: [] } };
  const mockContent = [{ type: 'text', text: JSON.stringify(mockJson) }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({ content: mockContent });
    mockListTools.mockResolvedValue({ tools: [{ name: 'read_doc' }, { name: 'update_doc' }] });
  });

  // =========================================================================
  // metadata
  // =========================================================================
  describe('metadata', () => {
    it('has the correct connector ID', () => {
      expect(GoogleDocsConnector.metadata.id).toBe('.google_docs');
    });

    it('ships with agentBuilder feature only (two-step release)', () => {
      expect(GoogleDocsConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('requires enterprise license', () => {
      expect(GoogleDocsConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('is marked as technical preview', () => {
      expect(GoogleDocsConnector.metadata.isTechnicalPreview).toBe(true);
    });
  });

  // =========================================================================
  // auth
  // =========================================================================
  describe('auth', () => {
    it('supports ears auth type as first visible option', () => {
      const visibleTypes = GoogleDocsConnector.auth?.types.filter(
        (t) => typeof t === 'string' || !(t as AuthTypeDef).isLegacy
      );
      expect(visibleTypes?.[0]).toEqual(expect.objectContaining({ type: 'ears' }));
    });

    it('ears auth uses Google provider and documents scope', () => {
      const earsType = GoogleDocsConnector.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'ears'
      );
      expect(earsType).toMatchObject({
        type: 'ears',
        defaults: {
          provider: 'google',
          scope: 'https://www.googleapis.com/auth/documents',
        },
        overrides: {
          meta: { scope: { disabled: true } },
        },
      });
    });

    it('supports oauth_authorization_code with correct Google defaults and hidden fields', () => {
      const oauthType = GoogleDocsConnector.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'oauth_authorization_code'
      );
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scope: 'https://www.googleapis.com/auth/documents',
        },
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
      });
    });
  });

  // =========================================================================
  // schema (config)
  // =========================================================================
  describe('schema', () => {
    it('defaults serverUrl to the Google Docs MCP server', () => {
      const parsed = GoogleDocsConnector.schema.parse({});
      expect(parsed.serverUrl).toBe('https://docsmcp.googleapis.com/mcp/v1');
    });

    it('accepts a custom serverUrl', () => {
      const parsed = GoogleDocsConnector.schema.parse({
        serverUrl: 'https://custom.example.com/mcp/v1',
      });
      expect(parsed.serverUrl).toBe('https://custom.example.com/mcp/v1');
    });
  });

  // =========================================================================
  // readDoc action
  // =========================================================================
  describe('readDoc action', () => {
    it('is exposed as a tool', () => {
      expect(GoogleDocsConnector.actions.readDoc.isTool).toBe(true);
    });

    it('passes document_id to the read_doc MCP tool', async () => {
      const input = parse('readDoc', { document_id: 'doc-abc123' });
      await GoogleDocsConnector.actions.readDoc.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'read_doc',
        arguments: { documentId: 'doc-abc123' },
      });
    });

    it('rejects missing document_id', () => {
      expect(() => parse('readDoc', {})).toThrow();
    });

    it('rejects empty document_id', () => {
      expect(() => parse('readDoc', { document_id: '' })).toThrow();
    });

    it('rejects document_id longer than 200 characters', () => {
      expect(() => parse('readDoc', { document_id: 'a'.repeat(201) })).toThrow();
    });
  });

  // =========================================================================
  // updateDoc action
  // =========================================================================
  describe('updateDoc action', () => {
    it('is exposed as a tool', () => {
      expect(GoogleDocsConnector.actions.updateDoc.isTool).toBe(true);
    });

    it('passes document_id and requests to the update_doc MCP tool', async () => {
      const requests = [{ insertText: { location: { index: 1 }, text: 'Hello' } }];
      const input = parse('updateDoc', { document_id: 'doc-abc123', requests });

      await GoogleDocsConnector.actions.updateDoc.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'update_doc',
        arguments: { documentId: 'doc-abc123', requests },
      });
    });

    it('accepts multiple requests in one call', async () => {
      const requests = [
        { insertText: { location: { index: 1 }, text: 'First' } },
        { replaceAllText: { containsText: { text: 'old' }, replaceText: 'new' } },
      ];
      const input = parse('updateDoc', { document_id: 'doc-1', requests });
      await GoogleDocsConnector.actions.updateDoc.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith(
        expect.objectContaining({
          arguments: expect.objectContaining({ documentId: 'doc-1', requests }),
        })
      );
    });

    it('rejects missing document_id', () => {
      expect(() =>
        parse('updateDoc', { requests: [{ insertText: { location: { index: 1 }, text: 'x' } }] })
      ).toThrow();
    });

    it('rejects empty requests array', () => {
      expect(() => parse('updateDoc', { document_id: 'doc-1', requests: [] })).toThrow();
    });

    it('rejects more than 100 requests', () => {
      const requests = Array.from({ length: 101 }, () => ({
        insertText: { location: { index: 1 }, text: 'x' },
      }));
      expect(() => parse('updateDoc', { document_id: 'doc-1', requests })).toThrow();
    });
  });

  // =========================================================================
  // listTools action
  // =========================================================================
  describe('listTools action', () => {
    it('is exposed as a tool', () => {
      expect(GoogleDocsConnector.actions.listTools.isTool).toBe(true);
    });

    it('calls mcp.listTools and returns the tool list', async () => {
      const input = parse('listTools', {});
      const result = await GoogleDocsConnector.actions.listTools.handler(mockContext, input);

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual([{ name: 'read_doc' }, { name: 'update_doc' }]);
    });
  });

  // =========================================================================
  // callTool action
  // =========================================================================
  describe('callTool action', () => {
    it('is exposed as a tool', () => {
      expect(GoogleDocsConnector.actions.callTool.isTool).toBe(true);
    });

    it('forwards name and arguments to the MCP server', async () => {
      const input = parse('callTool', {
        name: 'read_doc',
        arguments: { document_id: 'doc-xyz' },
      });
      await GoogleDocsConnector.actions.callTool.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'read_doc',
        arguments: { document_id: 'doc-xyz' },
      });
    });

    it('accepts a call with no arguments', async () => {
      const input = parse('callTool', { name: 'list_tools' });
      await GoogleDocsConnector.actions.callTool.handler(mockContext, input);

      // callToolContent substitutes undefined arguments with {} before forwarding to mcp.callTool
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_tools',
        arguments: {},
      });
    });
  });

  // =========================================================================
  // test handler
  // =========================================================================
  describe('test handler', () => {
    it('is enabled', () => {
      expect(GoogleDocsConnector.test?.enabled).toBe(true);
    });

    it('calls listTools and returns an empty object on success', async () => {
      const result = await GoogleDocsConnector.test.handler(mockContext);

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('propagates errors from listTools', async () => {
      mockListTools.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(GoogleDocsConnector.test.handler(mockContext)).rejects.toThrow('Unauthorized');
    });
  });
});
