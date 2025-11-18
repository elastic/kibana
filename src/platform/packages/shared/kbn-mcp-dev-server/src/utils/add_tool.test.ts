/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from '@kbn/zod';
import { addTool } from './add_tool';
import type { ToolDefinition } from '../types';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => {
    return {
      registerTool: jest.fn(),
    };
  }),
}));

describe('addTool', () => {
  it('correctly calls server.registerTool with the tool definition', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    const mockHandler = jest
      .fn()
      .mockResolvedValue({ content: [{ type: 'text', text: 'result' }] });

    const sampleTool: ToolDefinition<any> = {
      name: 'sample_tool',
      description: 'A sample tool for testing',
      inputSchema: z.object({
        param1: z.string().describe('A sample parameter'),
      }),
      handler: mockHandler,
    };

    addTool(server, sampleTool);

    expect(server.registerTool).toHaveBeenCalledTimes(1);
    expect(server.registerTool).toHaveBeenCalledWith(
      'sample_tool',
      {
        description: 'A sample tool for testing',
        inputSchema: sampleTool.inputSchema.shape,
      },
      expect.any(Function)
    );

    // Verify the handler function is correctly passed
    const handler = (server.registerTool as jest.Mock).mock.calls[0][2];
    const input = { param1: 'test' };
    await handler(input);
    expect(mockHandler).toHaveBeenCalledWith(input);
  });
});
