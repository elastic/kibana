/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { McpV2Connector } from './mcp_v2';

const mockCallTool = jest.fn();
const mockListTools = jest.fn();
const mockGetClient = jest.fn();

const makeCtx = (): ActionContext =>
  ({
    client: {},
    log: {},
    config: { serverUrl: 'https://mcp.example.com/mcp' },
    getClient: mockGetClient,
  } as unknown as ActionContext);

describe('McpV2Connector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClient.mockResolvedValue({ callTool: mockCallTool, listTools: mockListTools });
    mockListTools.mockResolvedValue({ tools: [{ name: 'a' }, { name: 'b' }] });
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '{"ok":true}' }] });
  });

  it('is a generic, testable MCP connector with legacy auth parity', () => {
    expect(McpV2Connector.metadata.id).toBe('.mcp_v2');
    expect(McpV2Connector.auth?.types).toEqual(['none', 'bearer', 'api_key_header', 'basic']);
    expect(McpV2Connector.test?.enabled).toBe(true);
  });

  describe('listTools action', () => {
    it('acquires the pooled mcp client and returns its tools', async () => {
      const ctx = makeCtx();
      const input = McpV2Connector.actions.listTools.input.parse({});

      const result = await McpV2Connector.actions.listTools.handler(ctx, input);

      expect(mockGetClient).toHaveBeenCalledWith('mcp');
      expect(result).toEqual([{ name: 'a' }, { name: 'b' }]);
    });
  });

  describe('callTool action', () => {
    it('calls the named tool via the pooled client and returns its content', async () => {
      const ctx = makeCtx();
      const input = McpV2Connector.actions.callTool.input.parse({
        name: 'search',
        arguments: { q: 'x' },
      });

      const result = await McpV2Connector.actions.callTool.handler(ctx, input);

      expect(mockGetClient).toHaveBeenCalledWith('mcp');
      expect(mockCallTool).toHaveBeenCalledWith({ name: 'search', arguments: { q: 'x' } });
      expect(result).toEqual([{ type: 'text', text: '{"ok":true}' }]);
    });
  });

  describe('test handler', () => {
    it('lists tools via the pooled client and reports the count', async () => {
      const ctx = makeCtx();
      const testDef = McpV2Connector.test;
      if (!testDef) throw new Error('expected test to be defined');

      const result = await testDef.handler(ctx);

      expect(mockGetClient).toHaveBeenCalledWith('mcp');
      expect(result).toEqual({ ok: true, message: 'Connected to MCP server. 2 tools available.' });
    });
  });
});
