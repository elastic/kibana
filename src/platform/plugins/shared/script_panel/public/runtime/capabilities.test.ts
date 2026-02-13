/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createCapabilityHandlers,
  createPanelCapabilities,
  type CapabilitiesOptions,
} from './capabilities';
import type { EsqlExecutor } from './esql_executor';
import type { LogEntry } from './types';

describe('Capability Handlers', () => {
  const createMockExecutor = (): jest.Mocked<EsqlExecutor> =>
    ({
      query: jest.fn().mockResolvedValue({ columns: [], rows: [], rowCount: 0 }),
      cancel: jest.fn(),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<EsqlExecutor>);

  const createMockOptions = (overrides?: Partial<CapabilitiesOptions>): CapabilitiesOptions => ({
    esqlExecutor: createMockExecutor(),
    getPanelSize: jest.fn().mockReturnValue({ width: 500, height: 300 }),
    setContent: jest.fn(),
    setError: jest.fn(),
    onLog: jest.fn(),
    ...overrides,
  });

  describe('esql.query handler', () => {
    it('should delegate to EsqlExecutor', async () => {
      const mockExecutor = createMockExecutor();
      const expectedResult = {
        columns: [{ name: 'count', type: 'number' }],
        rows: [{ count: 42 }],
        rowCount: 1,
      };
      mockExecutor.query.mockResolvedValue(expectedResult);

      const options = createMockOptions({ esqlExecutor: mockExecutor });
      const handlers = createCapabilityHandlers(options);

      const result = await handlers['esql.query']({ query: 'FROM test | STATS count()' });

      expect(mockExecutor.query).toHaveBeenCalledWith({
        query: 'FROM test | STATS count()',
      });
      expect(result).toEqual(expectedResult);
    });

    it('should pass through params and useContext', async () => {
      const mockExecutor = createMockExecutor();
      const options = createMockOptions({ esqlExecutor: mockExecutor });
      const handlers = createCapabilityHandlers(options);

      await handlers['esql.query']({
        query: 'FROM test | WHERE status = ?status',
        params: { status: 'active' },
        useContext: false,
      });

      expect(mockExecutor.query).toHaveBeenCalledWith({
        query: 'FROM test | WHERE status = ?status',
        params: { status: 'active' },
        useContext: false,
      });
    });

    it('should propagate executor errors', async () => {
      const mockExecutor = createMockExecutor();
      mockExecutor.query.mockRejectedValue(new Error('Query failed'));

      const options = createMockOptions({ esqlExecutor: mockExecutor });
      const handlers = createCapabilityHandlers(options);

      await expect(handlers['esql.query']({ query: 'FROM invalid' })).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('panel.getSize handler', () => {
    it('should return current panel dimensions', async () => {
      const getPanelSize = jest.fn().mockReturnValue({ width: 800, height: 600 });
      const options = createMockOptions({ getPanelSize });
      const handlers = createCapabilityHandlers(options);

      const result = await handlers['panel.getSize']();

      expect(getPanelSize).toHaveBeenCalled();
      expect(result).toEqual({ width: 800, height: 600 });
    });
  });

  describe('render.setContent handler', () => {
    it('should call setContent with HTML string', async () => {
      const setContent = jest.fn();
      const options = createMockOptions({ setContent });
      const handlers = createCapabilityHandlers(options);

      await handlers['render.setContent']({ html: '<div>Hello World</div>' });

      expect(setContent).toHaveBeenCalledWith('<div>Hello World</div>');
    });

    it('should reject non-string content', async () => {
      const setContent = jest.fn();
      const options = createMockOptions({ setContent });
      const handlers = createCapabilityHandlers(options);

      await expect(
        handlers['render.setContent']({ html: 123 as unknown as string })
      ).rejects.toThrow('Content must be a string');

      expect(setContent).not.toHaveBeenCalled();
    });

    it('should reject content exceeding 1MB', async () => {
      const setContent = jest.fn();
      const options = createMockOptions({ setContent });
      const handlers = createCapabilityHandlers(options);

      // Create content > 1MB
      const largeContent = 'x'.repeat(1024 * 1024 + 1);

      await expect(handlers['render.setContent']({ html: largeContent })).rejects.toThrow(
        'Content exceeds maximum size'
      );

      expect(setContent).not.toHaveBeenCalled();
    });

    it('should accept content at exactly 1MB', async () => {
      const setContent = jest.fn();
      const options = createMockOptions({ setContent });
      const handlers = createCapabilityHandlers(options);

      // Create content exactly 1MB
      const exactContent = 'x'.repeat(1024 * 1024);

      await handlers['render.setContent']({ html: exactContent });

      expect(setContent).toHaveBeenCalledWith(exactContent);
    });
  });

  describe('render.setError handler', () => {
    it('should call setError with message', async () => {
      const setError = jest.fn();
      const options = createMockOptions({ setError });
      const handlers = createCapabilityHandlers(options);

      await handlers['render.setError']({ message: 'Something went wrong' });

      expect(setError).toHaveBeenCalledWith('Something went wrong');
    });

    it('should convert non-string messages to string', async () => {
      const setError = jest.fn();
      const options = createMockOptions({ setError });
      const handlers = createCapabilityHandlers(options);

      await handlers['render.setError']({ message: 42 as unknown as string });

      expect(setError).toHaveBeenCalledWith('42');
    });
  });

  describe('log handlers', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should capture log.info entries', () => {
      const onLog = jest.fn();
      const options = createMockOptions({ onLog });
      const handlers = createCapabilityHandlers(options);

      handlers['log.info']({ args: ['Hello', 'World'] });

      expect(onLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'Hello World',
          args: ['Hello', 'World'],
        })
      );
    });

    it('should capture log.warn entries', () => {
      const onLog = jest.fn();
      const options = createMockOptions({ onLog });
      const handlers = createCapabilityHandlers(options);

      handlers['log.warn']({ args: ['Warning!'] });

      expect(onLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          message: 'Warning!',
        })
      );
    });

    it('should capture log.error entries', () => {
      const onLog = jest.fn();
      const options = createMockOptions({ onLog });
      const handlers = createCapabilityHandlers(options);

      handlers['log.error']({ args: ['Error occurred'] });

      expect(onLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: 'Error occurred',
        })
      );
    });

    it('should include timestamp in log entries', () => {
      const onLog = jest.fn();
      const options = createMockOptions({ onLog });
      const handlers = createCapabilityHandlers(options);

      const beforeTime = Date.now();
      handlers['log.info']({ args: ['test'] });
      const afterTime = Date.now();

      const logEntry = onLog.mock.calls[0][0] as LogEntry;
      expect(logEntry.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(logEntry.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should stringify complex objects in log messages', () => {
      const onLog = jest.fn();
      const options = createMockOptions({ onLog });
      const handlers = createCapabilityHandlers(options);

      handlers['log.info']({ args: [{ foo: 'bar', count: 42 }] });

      const logEntry = onLog.mock.calls[0][0] as LogEntry;
      expect(logEntry.message).toContain('foo');
      expect(logEntry.message).toContain('bar');
    });

    it('should handle null and undefined in log args', () => {
      const onLog = jest.fn();
      const options = createMockOptions({ onLog });
      const handlers = createCapabilityHandlers(options);

      handlers['log.info']({ args: [null, undefined, 'text'] });

      const logEntry = onLog.mock.calls[0][0] as LogEntry;
      expect(logEntry.message).toContain('null');
      expect(logEntry.message).toContain('undefined');
      expect(logEntry.message).toContain('text');
    });

    it('should handle Error objects in log args', () => {
      const onLog = jest.fn();
      const options = createMockOptions({ onLog });
      const handlers = createCapabilityHandlers(options);

      const error = new Error('Test error');
      handlers['log.error']({ args: [error] });

      const logEntry = onLog.mock.calls[0][0] as LogEntry;
      expect(logEntry.message).toContain('Error');
      expect(logEntry.message).toContain('Test error');
    });

    it('should work without onLog callback', () => {
      const options = createMockOptions({ onLog: undefined });
      const handlers = createCapabilityHandlers(options);

      // Should not throw
      expect(() => handlers['log.info']({ args: ['test'] })).not.toThrow();
    });

    it('should log to console with ScriptPanel prefix', () => {
      const options = createMockOptions();
      const handlers = createCapabilityHandlers(options);

      handlers['log.info']({ args: ['test message'] });

      expect(consoleSpy).toHaveBeenCalledWith('[ScriptPanel]', 'test message');
    });
  });
});

describe('createPanelCapabilities', () => {
  const createMockExecutor = (): jest.Mocked<EsqlExecutor> =>
    ({
      query: jest.fn().mockResolvedValue({ columns: [], rows: [], rowCount: 0 }),
      cancel: jest.fn(),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<EsqlExecutor>);

  it('should return handlers object', () => {
    const mockExecutor = createMockExecutor();
    const options: CapabilitiesOptions = {
      esqlExecutor: mockExecutor,
      getPanelSize: jest.fn(),
      setContent: jest.fn(),
      setError: jest.fn(),
    };

    const capabilities = createPanelCapabilities(options);

    expect(capabilities.handlers).toBeDefined();
    expect(capabilities.handlers['esql.query']).toBeDefined();
    expect(capabilities.handlers['panel.getSize']).toBeDefined();
    expect(capabilities.handlers['render.setContent']).toBeDefined();
    expect(capabilities.handlers['render.setError']).toBeDefined();
    expect(capabilities.handlers['log.info']).toBeDefined();
    expect(capabilities.handlers['log.warn']).toBeDefined();
    expect(capabilities.handlers['log.error']).toBeDefined();
  });

  it('should destroy executor on destroy call', () => {
    const mockExecutor = createMockExecutor();
    const options: CapabilitiesOptions = {
      esqlExecutor: mockExecutor,
      getPanelSize: jest.fn(),
      setContent: jest.fn(),
      setError: jest.fn(),
    };

    const capabilities = createPanelCapabilities(options);
    capabilities.destroy();

    expect(mockExecutor.destroy).toHaveBeenCalled();
  });
});
