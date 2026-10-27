/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { UnauthorizedError } from '@kbn/mcp-client';
import type { ActionContext } from '../../connector_spec';
import { mcpConnectorSpec } from './mcp';
import { listToolsCache } from './list_tools_cache';

const createLog = (): jest.Mocked<Pick<Logger, 'debug' | 'warn' | 'error'>> => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('mcpConnectorSpec handlers', () => {
  const fakeClient = {
    listTools: jest.fn(),
    callTool: jest.fn(),
    getServerCapabilities: jest.fn(),
  };
  const usage = { addRequestBodyBytes: jest.fn() };
  let log: ReturnType<typeof createLog>;

  const createCtx = (overrides: Partial<ActionContext> = {}): ActionContext =>
    ({
      log,
      config: { serverUrl: 'https://example.com/mcp', hasAuth: false },
      secrets: {},
      connectorId: 'connector-1',
      connectorUsageCollector: usage,
      getClient: jest.fn().mockResolvedValue(fakeClient),
      client: {},
      ...overrides,
    } as unknown as ActionContext);

  beforeEach(() => {
    jest.clearAllMocks();
    listToolsCache.clear();
    log = createLog();
    fakeClient.listTools.mockResolvedValue({ tools: [{ name: 'echo' }] });
    fakeClient.callTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
    fakeClient.getServerCapabilities.mockReturnValue({ tools: {} });
  });

  it('test returns connected and capabilities', async () => {
    const result = await mcpConnectorSpec.actions.test.handler(createCtx(), {});

    expect(result).toEqual({ connected: true, capabilities: { tools: {} } });
    expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
  });

  it('listTools fetches on a miss and caches the result', async () => {
    const ctx = createCtx();
    const first = await mcpConnectorSpec.actions.listTools.handler(ctx, {});
    const second = await mcpConnectorSpec.actions.listTools.handler(ctx, {});

    expect(first).toEqual({ tools: [{ name: 'echo' }] });
    expect(second).toEqual(first);
    expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
    expect(usage.addRequestBodyBytes).toHaveBeenCalledTimes(1);
    expect(usage.addRequestBodyBytes).toHaveBeenCalledWith(undefined, {});
  });

  it('bypasses the cache when forceRefresh is true', async () => {
    const ctx = createCtx();
    await mcpConnectorSpec.actions.listTools.handler(ctx, {});
    fakeClient.listTools.mockResolvedValue({ tools: [{ name: 'next' }] });

    const refreshed = await mcpConnectorSpec.actions.listTools.handler(ctx, { forceRefresh: true });

    expect(refreshed).toEqual({ tools: [{ name: 'next' }] });
    expect(fakeClient.listTools).toHaveBeenCalledTimes(2);
  });

  it('isolates the cache by connector id', async () => {
    await mcpConnectorSpec.actions.listTools.handler(createCtx({ connectorId: 'a' }), {});
    await mcpConnectorSpec.actions.listTools.handler(createCtx({ connectorId: 'b' }), {});

    expect(fakeClient.listTools).toHaveBeenCalledTimes(2);
  });

  it('does not cache a listTools error', async () => {
    fakeClient.listTools
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ tools: [] });
    const ctx = createCtx();

    await expect(mcpConnectorSpec.actions.listTools.handler(ctx, {})).rejects.toThrow('boom');
    await expect(mcpConnectorSpec.actions.listTools.handler(ctx, {})).resolves.toEqual({
      tools: [],
    });
    expect(fakeClient.listTools).toHaveBeenCalledTimes(2);
  });

  it('callTool forwards name and arguments and records usage bytes', async () => {
    const params = { name: 'echo', arguments: { q: 1 } };
    const result = await mcpConnectorSpec.actions.callTool.handler(createCtx(), params);

    expect(fakeClient.callTool).toHaveBeenCalledWith(params);
    expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
    expect(usage.addRequestBodyBytes).toHaveBeenCalledWith(undefined, params);
  });

  it('classifies a user error and logs it', async () => {
    fakeClient.callTool.mockRejectedValue(new UnauthorizedError('unauthorized'));

    await expect(
      mcpConnectorSpec.actions.callTool.handler(createCtx(), { name: 'echo', arguments: {} })
    ).rejects.toThrow('unauthorized');
    expect(log.warn).toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('redacts tool-level error messages', async () => {
    fakeClient.callTool.mockRejectedValue(new Error('token s3cr3t'));

    await expect(
      mcpConnectorSpec.actions.callTool.handler(createCtx(), {
        name: 'echo',
        arguments: { token: 's3cr3t' },
      })
    ).rejects.toThrow('token s3cr3t');
    expect(log.error).toHaveBeenCalledWith('MCP callTool(echo) failed');
    expect(log.error).not.toHaveBeenCalledWith(expect.stringContaining('s3cr3t'));
  });
});
