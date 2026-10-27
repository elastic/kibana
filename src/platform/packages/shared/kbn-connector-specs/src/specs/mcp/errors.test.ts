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
import { classifyMcpError, logMcpError } from './errors';

const createLog = (): jest.Mocked<Pick<Logger, 'warn' | 'error'>> => ({
  warn: jest.fn(),
  error: jest.fn(),
});

describe('classifyMcpError', () => {
  it('classifies unauthorized failures as user errors', () => {
    expect(classifyMcpError(new UnauthorizedError('unauthorized'))).toBe('user');
  });

  it('leaves other failures unclassified so the executor rethrows them raw', () => {
    expect(classifyMcpError(new Error('socket closed'))).toBeUndefined();
  });
});

describe('logMcpError', () => {
  it('warns with the message for a user error', () => {
    const log = createLog();
    logMcpError(log as unknown as Logger, new UnauthorizedError('unauthorized'), {
      operation: 'callTool(test-tool)',
    });

    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('MCP callTool(test-tool) failed: unauthorized')
    );
    expect(log.error).not.toHaveBeenCalled();
  });

  it('logs a non-user connection failure with the message', () => {
    const log = createLog();
    logMcpError(log as unknown as Logger, new Error('socket closed'), {
      operation: 'callTool(test-tool)',
    });

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('MCP callTool(test-tool) failed: socket closed')
    );
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('omits the error message for a redacted tool failure', () => {
    const log = createLog();
    logMcpError(
      log as unknown as Logger,
      new Error(`Error calling tool 'test-tool' with arguments '{"token":"s3cr3t"}'`),
      { operation: 'callTool(test-tool)', redactToolError: true }
    );

    expect(log.error).toHaveBeenCalledWith('MCP callTool(test-tool) failed');
    expect(log.error).not.toHaveBeenCalledWith(expect.stringContaining('s3cr3t'));
  });
});
