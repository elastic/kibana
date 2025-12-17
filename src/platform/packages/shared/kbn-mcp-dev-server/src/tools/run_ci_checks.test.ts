/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

jest.mock('execa');
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo/root' }));

import { runCiChecksTool } from './run_ci_checks';
import { parseToolResultJsonContent } from './test_utils';

const mockedExeca = execa as jest.Mocked<typeof execa>;

describe('runCiChecksTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have the correct name', () => {
    expect(runCiChecksTool.name).toBe('run_ci_checks');
  });

  it('should have a description', () => {
    expect(runCiChecksTool.description).toBeTruthy();
    expect(typeof runCiChecksTool.description).toBe('string');
  });

  it('should have an input schema', () => {
    expect(runCiChecksTool.inputSchema).toBeDefined();
  });

  it('should have a handler function', () => {
    expect(runCiChecksTool.handler).toBeDefined();
    expect(typeof runCiChecksTool.handler).toBe('function');
  });

  it('should have default values for optional parameters', () => {
    const schema = runCiChecksTool.inputSchema;
    const defaults = schema.parse({});

    expect(defaults.checks).toEqual([
      'build',
      'quick_checks',
      'checks',
      'type_check',
      'linting_with_types',
      'linting',
      'oas_snapshot',
    ]);
    expect(defaults.parallel).toBe(true);
  });

  it('should accept custom checks', () => {
    const schema = runCiChecksTool.inputSchema;
    const customChecks = schema.parse({
      checks: ['build', 'type_check'],
    });

    expect(customChecks.checks).toEqual(['build', 'type_check']);
    expect(customChecks.parallel).toBe(true);
  });

  it('should accept custom parallel setting', () => {
    const schema = runCiChecksTool.inputSchema;
    const sequential = schema.parse({
      parallel: false,
    });

    expect(sequential.parallel).toBe(false);
  });

  describe('handler', () => {
    it('runs checks successfully in parallel', async () => {
      mockedExeca.command.mockResolvedValue({} as any);

      const result = await runCiChecksTool.handler({
        checks: ['build', 'type_check'],
        parallel: true,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.results).toHaveLength(2);
      expect(parsedResult.results[0].status).toBe('passed');
      expect(parsedResult.results[1].status).toBe('passed');
      expect(mockedExeca.command).toHaveBeenCalledTimes(2);
    });

    it('runs checks successfully sequentially', async () => {
      mockedExeca.command.mockResolvedValue({} as any);

      const result = await runCiChecksTool.handler({
        checks: ['build', 'type_check'],
        parallel: false,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.results).toHaveLength(2);
      expect(mockedExeca.command).toHaveBeenCalledTimes(2);
    });

    it('handles check failures', async () => {
      const error = new Error('Build failed');
      mockedExeca.command.mockRejectedValue(error);

      const result = await runCiChecksTool.handler({
        checks: ['build'],
        parallel: false,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.results).toHaveLength(1);
      expect(parsedResult.results[0].status).toBe('failed');
      expect(parsedResult.results[0].error).toBe('Build failed');
      expect(parsedResult.results[0].duration).toBeDefined();
    });

    it('handles unknown check', async () => {
      const result = await runCiChecksTool.handler({
        checks: ['unknown_check' as any],
        parallel: false,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.results).toHaveLength(0);
    });

    it('filters out unknown checks and runs valid ones', async () => {
      mockedExeca.command.mockResolvedValue({} as any);

      const result = await runCiChecksTool.handler({
        checks: ['build', 'unknown_check' as any, 'type_check'],
        parallel: false,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.results).toHaveLength(2);
      expect(mockedExeca.command).toHaveBeenCalledTimes(2);
    });

    it('returns failure when all checks fail', async () => {
      const error = new Error('Check failed');
      mockedExeca.command.mockRejectedValue(error);

      const result = await runCiChecksTool.handler({
        checks: ['build', 'type_check'],
        parallel: true,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.results.every((r: any) => r.status === 'failed')).toBe(true);
    });

    it('returns failure when some checks fail', async () => {
      let callCount = 0;
      (mockedExeca.command as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({} as any);
        }
        return Promise.reject(new Error('Type check failed'));
      });

      const result = await runCiChecksTool.handler({
        checks: ['build', 'type_check'],
        parallel: true,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.results[0].status).toBe('passed');
      expect(parsedResult.results[1].status).toBe('failed');
    });

    it('includes duration in results', async () => {
      mockedExeca.command.mockResolvedValue({} as any);

      const result = await runCiChecksTool.handler({
        checks: ['build'],
        parallel: false,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.results[0].duration).toBeDefined();
      expect(typeof parsedResult.results[0].duration).toBe('number');
      expect(parsedResult.totalDuration).toBeDefined();
      expect(typeof parsedResult.totalDuration).toBe('number');
    });

    it('handles error without message', async () => {
      const error = { message: undefined };
      mockedExeca.command.mockRejectedValue(error);

      const result = await runCiChecksTool.handler({
        checks: ['build'],
        parallel: false,
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.results[0].error).toBe('Unknown error');
    });

    it('uses default checks when not specified', async () => {
      mockedExeca.command.mockResolvedValue({} as any);

      // Parse empty input to get defaults
      const input = runCiChecksTool.inputSchema.parse({});
      const result = await runCiChecksTool.handler(input);

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.results.length).toBeGreaterThan(0);
      expect(mockedExeca.command).toHaveBeenCalled();
    });

    it('calls execa with correct options', async () => {
      mockedExeca.command.mockResolvedValue({} as any);

      await runCiChecksTool.handler({
        checks: ['build'],
        parallel: false,
      });

      expect(mockedExeca.command).toHaveBeenCalledWith(
        'node --no-experimental-require-module scripts/build_kibana_platform_plugins',
        {
          cwd: '/repo/root',
          stdio: 'pipe',
          timeout: 900000,
        }
      );
    });
  });
});
