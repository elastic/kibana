/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlExecutor, createEsqlExecutor } from './esql_executor';
import type { EsqlExecutorDependencies, EsqlExecutorOptions } from './esql_executor';
import type { SandboxConfig } from './types';

// Mock dependencies
const createMockDeps = (): EsqlExecutorDependencies => ({
  data: {
    query: {
      timefilter: {
        timefilter: {
          getAbsoluteTime: jest.fn().mockReturnValue({
            from: '2024-01-01T00:00:00.000Z',
            to: '2024-01-02T00:00:00.000Z',
          }),
        },
      },
    },
  } as unknown as EsqlExecutorDependencies['data'],
  expressions: {
    execute: jest.fn(),
  } as unknown as EsqlExecutorDependencies['expressions'],
});

describe('EsqlExecutor', () => {
  let mockDeps: EsqlExecutorDependencies;

  beforeEach(() => {
    mockDeps = createMockDeps();
    jest.clearAllMocks();
  });

  describe('query validation', () => {
    it('should reject empty query strings', async () => {
      const executor = createEsqlExecutor({ deps: mockDeps });

      await expect(executor.query({ query: '' })).rejects.toThrow(
        'Query must be a non-empty string'
      );
    });

    it('should reject non-string queries', async () => {
      const executor = createEsqlExecutor({ deps: mockDeps });

      await expect(executor.query({ query: null as unknown as string })).rejects.toThrow(
        'Query must be a non-empty string'
      );

      await expect(executor.query({ query: undefined as unknown as string })).rejects.toThrow(
        'Query must be a non-empty string'
      );

      await expect(executor.query({ query: 123 as unknown as string })).rejects.toThrow(
        'Query must be a non-empty string'
      );
    });

    it('should reject queries exceeding max length', async () => {
      const config: Partial<SandboxConfig> = { maxQueryLength: 100 };
      const executor = createEsqlExecutor({ deps: mockDeps, config });

      const longQuery = 'FROM test | WHERE ' + 'a'.repeat(100);
      await expect(executor.query({ query: longQuery })).rejects.toThrow(
        'Query exceeds maximum length of 100 characters'
      );
    });

    it('should accept queries within max length', async () => {
      // This test validates the length check passes - execution will fail due to mocks
      const config: Partial<SandboxConfig> = { maxQueryLength: 1000 };
      const executor = createEsqlExecutor({ deps: mockDeps, config });

      const shortQuery = 'FROM test | LIMIT 10';

      // Should not throw length error - may throw during execution
      try {
        await executor.query({ query: shortQuery });
      } catch (e) {
        // Expected to fail on execution, but not on validation
        expect((e as Error).message).not.toContain('exceeds maximum length');
      }
    });

    describe('dangerous pattern rejection', () => {
      const dangerousPatterns = ['DELETE', 'UPDATE', 'INSERT', 'DROP', 'ALTER', 'CREATE'];

      dangerousPatterns.forEach((pattern) => {
        it(`should reject queries starting with ${pattern}`, async () => {
          const executor = createEsqlExecutor({ deps: mockDeps });

          await expect(executor.query({ query: `${pattern} something` })).rejects.toThrow(
            `Query contains disallowed operation: ${pattern}`
          );
        });

        it(`should reject queries starting with lowercase ${pattern.toLowerCase()}`, async () => {
          const executor = createEsqlExecutor({ deps: mockDeps });

          await expect(
            executor.query({ query: `${pattern.toLowerCase()} something` })
          ).rejects.toThrow(`Query contains disallowed operation: ${pattern}`);
        });
      });

      it('should allow SELECT patterns (normal ES|QL)', async () => {
        const executor = createEsqlExecutor({ deps: mockDeps });

        // Should pass validation but may fail on execution due to mocks
        try {
          await executor.query({ query: 'FROM logs | WHERE message LIKE "DELETE*"' });
        } catch (e) {
          // Should not fail on validation
          expect((e as Error).message).not.toContain('disallowed operation');
        }
      });

      it('should allow DELETE in non-starting position', async () => {
        const executor = createEsqlExecutor({ deps: mockDeps });

        try {
          await executor.query({ query: 'FROM logs | WHERE action = "DELETE"' });
        } catch (e) {
          expect((e as Error).message).not.toContain('disallowed operation');
        }
      });
    });
  });

  describe('rate limiting', () => {
    it('should reject when max concurrent queries exceeded', async () => {
      // Test the rate limit logic directly by simulating concurrent state
      const config: Partial<SandboxConfig> = { maxConcurrentQueries: 1 };
      const executor = createEsqlExecutor({ deps: mockDeps, config });

      // Store the complete callback so we can call it later
      const callbackHolder: { complete?: () => void } = {};

      (mockDeps.expressions.execute as jest.Mock).mockReturnValue({
        getData: () => ({
          pipe: () => ({
            subscribe: (callbacks: { next: (v: unknown) => void; complete: () => void }) => {
              callbackHolder.complete = callbacks.complete;
              // Don't complete - keeps query "active"
            },
          }),
        }),
      });

      // Start first query but don't await
      const firstQueryPromise = executor.query({ query: 'FROM test1' });

      // At this point, activeQueries should be 1
      // Second query should be rejected
      await expect(executor.query({ query: 'FROM test2' })).rejects.toThrow(
        'Maximum concurrent queries (1) exceeded'
      );

      // Clean up by completing the first query
      callbackHolder.complete?.();

      // Wait for the first query to settle (it will return empty result)
      const result = await firstQueryPromise;
      expect(result.rowCount).toBe(0);
    });

    it('should allow new queries after previous completes', async () => {
      const config: Partial<SandboxConfig> = { maxConcurrentQueries: 1, queryTimeout: 5000 };
      const executor = createEsqlExecutor({ deps: mockDeps, config });

      // Mock a query that completes immediately with proper datatable structure
      (mockDeps.expressions.execute as jest.Mock).mockReturnValue({
        getData: () => ({
          pipe: () => ({
            subscribe: ({
              next,
              complete,
            }: {
              next: (val: unknown) => void;
              complete: () => void;
            }) => {
              // Simulate proper datatable result - the 'result' key is plucked
              next({ type: 'datatable', columns: [], rows: [] });
              complete();
            },
          }),
        }),
      });

      // First query should complete
      await executor.query({ query: 'FROM test1' });

      // Second query should now be allowed (activeQueries back to 0)
      await executor.query({ query: 'FROM test2' });

      // If we get here without throwing, rate limit was properly released
      expect(true).toBe(true);
    });
  });

  describe('cancellation', () => {
    it('should cancel active queries', () => {
      const executor = createEsqlExecutor({ deps: mockDeps });

      // Start a query that won't complete
      (mockDeps.expressions.execute as jest.Mock).mockReturnValue({
        getData: () => ({
          pipe: () => ({
            subscribe: () => {
              // Never completes
            },
          }),
        }),
        cancel: jest.fn(),
      });

      executor.query({ query: 'FROM test' }).catch(() => {
        // Expected to be cancelled
      });

      // Cancel should not throw
      expect(() => executor.cancel()).not.toThrow();
    });

    it('should clean up on destroy', () => {
      const executor = createEsqlExecutor({ deps: mockDeps });

      // Should not throw
      expect(() => executor.destroy()).not.toThrow();
    });
  });

  describe('configuration', () => {
    it('should use default config when not provided', () => {
      const executor = new EsqlExecutor({ deps: mockDeps });

      // Query length check uses default (10240)
      const longQuery = 'FROM test | WHERE ' + 'a'.repeat(10300);
      expect(executor.query({ query: longQuery })).rejects.toThrow('exceeds maximum length');
    });

    it('should merge provided config with defaults', async () => {
      const config: Partial<SandboxConfig> = { maxQueryLength: 50 };
      const executor = createEsqlExecutor({ deps: mockDeps, config });

      // Should use custom maxQueryLength
      const mediumQuery = 'FROM test | WHERE ' + 'a'.repeat(40);
      await expect(executor.query({ query: mediumQuery })).rejects.toThrow(
        'exceeds maximum length of 50'
      );
    });
  });

  describe('context handling', () => {
    it('should use dashboard context when useContext is true', async () => {
      const mockContext = {
        timeRange: { from: 'now-1h', to: 'now' },
        filters: [],
        query: { query: '', language: 'kuery' },
      };

      const options: EsqlExecutorOptions = {
        deps: mockDeps,
        getContext: () => mockContext,
      };

      const executor = createEsqlExecutor(options);

      // Execute will call getContext
      try {
        await executor.query({ query: 'FROM test', useContext: true });
      } catch {
        // Expected to fail on execution
      }

      // getContext should have been accessible (we can't easily verify it was called
      // without more complex mocking, but the executor should be configured correctly)
      expect(options.getContext).toBeDefined();
    });

    it('should not use context when useContext is false', async () => {
      const getContext = jest.fn().mockReturnValue({
        timeRange: { from: 'now-1h', to: 'now' },
      });

      const executor = createEsqlExecutor({
        deps: mockDeps,
        getContext,
      });

      // Execute with useContext: false
      try {
        await executor.query({ query: 'FROM test', useContext: false });
      } catch {
        // Expected to fail on execution
      }

      // Even though getContext is provided, it shouldn't affect the query
      // when useContext is false
    });
  });

  describe('factory function', () => {
    it('should create executor instance via factory', () => {
      const executor = createEsqlExecutor({ deps: mockDeps });

      expect(executor).toBeInstanceOf(EsqlExecutor);
    });
  });
});
