/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mcpClientType } from './mcp_client_type';
import { clientTypes } from './index';
import { createMcpClientFromAxios } from '../mcp/create_mcp_client_from_axios';

jest.mock('../mcp/create_mcp_client_from_axios');

const mockCreateMcpClientFromAxios = createMcpClientFromAxios as jest.MockedFunction<
  typeof createMcpClientFromAxios
>;

describe('clientTypes registry', () => {
  it('is closed; no register() export', () => {
    expect((clientTypes as Record<string, unknown>).register).toBeUndefined();
  });

  it('contains exactly { mcp: mcpClientType }', () => {
    expect(Object.keys(clientTypes)).toEqual(['mcp']);
    expect(clientTypes.mcp).toBe(mcpClientType);
  });

  it('clientTypes.mcp.id === "mcp"', () => {
    expect(clientTypes.mcp.id).toBe('mcp');
  });
});

describe('mcpClientType', () => {
  const fakeAxiosInstance = {} as import('axios').AxiosInstance;
  const fakeLogger = { error: jest.fn(), info: jest.fn() } as unknown as import('@kbn/logging').Logger;

  const fakeBuildContext = {
    logger: fakeLogger,
    axiosInstance: fakeAxiosInstance,
    config: { serverUrl: 'http://mcp.example.com' },
  };

  let mockConnect: jest.Mock;
  let mockDisconnect: jest.Mock;
  let mockClient: { connect: jest.Mock; disconnect: jest.Mock };

  beforeEach(() => {
    mockConnect = jest.fn().mockResolvedValue(undefined);
    mockDisconnect = jest.fn().mockResolvedValue(undefined);
    mockClient = { connect: mockConnect, disconnect: mockDisconnect };
    mockCreateMcpClientFromAxios.mockReturnValue(
      mockClient as unknown as ReturnType<typeof createMcpClientFromAxios>
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('build', () => {
    it('calls createMcpClientFromAxios with the correct args and connects', async () => {
      const result = await mcpClientType.build(fakeBuildContext);

      expect(mockCreateMcpClientFromAxios).toHaveBeenCalledWith({
        logger: fakeLogger,
        axiosInstance: fakeAxiosInstance,
        url: 'http://mcp.example.com',
        name: 'kibana-mcp-http://mcp.example.com',
        version: '1.0.0',
      });
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockClient);
    });

    it('throws if config.serverUrl is missing', async () => {
      await expect(
        mcpClientType.build({ ...fakeBuildContext, config: {} })
      ).rejects.toThrow('config.serverUrl is required');
    });

    it('throws if config is undefined', async () => {
      await expect(
        mcpClientType.build({ ...fakeBuildContext, config: undefined })
      ).rejects.toThrow('config.serverUrl is required');
    });
  });

  describe('terminate', () => {
    it('calls client.disconnect()', async () => {
      await mcpClientType.terminate(mockClient as unknown as import('@kbn/mcp-client').McpClient);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
