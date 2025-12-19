/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { ConcurrencySettings, WorkflowContext } from '@kbn/workflows';
import { ConcurrencyManager } from './concurrency_manager';

describe('ConcurrencyManager', () => {
  let logger: jest.Mocked<Logger>;
  let concurrencyManager: ConcurrencyManager;
  let mockContext: WorkflowContext;

  beforeEach(() => {
    // Logger mock - following common pattern in workflow execution engine tests
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    concurrencyManager = new ConcurrencyManager(logger);

    mockContext = {
      execution: {
        id: 'test-execution-id',
        isTestRun: false,
        startedAt: new Date(),
        url: 'http://localhost:5601',
      },
      workflow: {
        id: 'test-workflow-id',
        name: 'Test Workflow',
        enabled: true,
        spaceId: 'default',
      },
      kibanaUrl: 'http://localhost:5601',
      consts: {},
      event: {
        alerts: [],
        rule: {
          id: 'test-rule-id',
          name: 'Test Rule',
          tags: [],
          consumer: 'test',
          producer: 'test',
          ruleTypeId: 'test',
        },
        spaceId: 'default',
        params: {},
      },
      inputs: {
        serverName: 'mamba',
        hostName: 'server-1',
      },
      now: new Date(),
    };
  });

  describe('evaluateConcurrencyKey', () => {
    describe('static string keys', () => {
      it('should return static string as-is', () => {
        const settings: ConcurrencySettings = {
          key: 'server-1',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBe('server-1');
      });

      it('should return static string with special characters', () => {
        const settings: ConcurrencySettings = {
          key: 'server-1.prod.us-east-1',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBe('server-1.prod.us-east-1');
      });

      it('should handle static string with spaces', () => {
        const settings: ConcurrencySettings = {
          key: 'server 1',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBe('server 1');
      });
    });

    describe('template expression evaluation', () => {
      it('should evaluate template expression with inputs', () => {
        const settings: ConcurrencySettings = {
          key: '{{ inputs.serverName }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBe('mamba');
      });

      it('should evaluate template expression with event', () => {
        const settings: ConcurrencySettings = {
          key: '{{ event.rule.id }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBe('test-rule-id');
      });

      it('should evaluate nested template expression with event context', () => {
        const contextWithNested = {
          ...mockContext,
          event: {
            ...mockContext.event!,
            params: {
              host: {
                name: 'server-1',
              },
            },
          },
        };
        const settings: ConcurrencySettings = {
          key: '{{ event.params.host.name }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithNested);
        expect(result).toBe('server-1');
      });

      it('should evaluate template expression with workflow context', () => {
        const settings: ConcurrencySettings = {
          key: '{{ workflow.id }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBe('test-workflow-id');
      });
    });

    describe('null/undefined handling', () => {
      it('should return null when concurrency settings are undefined', () => {
        const result = concurrencyManager.evaluateConcurrencyKey(undefined, mockContext);
        expect(result).toBeNull();
      });

      it('should return null when key is undefined', () => {
        const settings: ConcurrencySettings = {};
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBeNull();
      });

      it('should return null when key is empty string', () => {
        const settings: ConcurrencySettings = {
          key: '',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBeNull();
      });

      it('should return key as-is when template evaluates to null', () => {
        const contextWithNull: WorkflowContext = {
          ...mockContext,
          inputs: {
            serverName: null as any, // Testing null evaluation - inputs schema doesn't allow null, but template engine may return it
          },
        };
        const settings: ConcurrencySettings = {
          key: '{{ inputs.serverName }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithNull);
        // If template evaluates to null, treat as static string (user may have intended literal text)
        expect(result).toBe('{{ inputs.serverName }}');
      });

      it('should return key as-is when template evaluates to undefined', () => {
        const contextWithUndefined: WorkflowContext = {
          ...mockContext,
          inputs: {
            serverName: undefined as any, // Testing undefined evaluation - inputs schema doesn't allow undefined, but template engine may return it
          },
        };
        const settings: ConcurrencySettings = {
          key: '{{ inputs.serverName }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithUndefined);
        // If template evaluates to undefined, treat as static string (user may have intended literal text)
        expect(result).toBe('{{ inputs.serverName }}');
      });

      it('should return null when template evaluates to empty string', () => {
        const contextWithEmpty = {
          ...mockContext,
          inputs: {
            serverName: '',
          },
        };
        const settings: ConcurrencySettings = {
          key: '{{ inputs.serverName }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithEmpty);
        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should return key as-is when template expression references non-existent field', () => {
        const settings: ConcurrencySettings = {
          key: '{{ inputs.nonexistent.field }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        // If template evaluates to null/undefined, treat as static string (user may have intended literal text)
        expect(result).toBe('{{ inputs.nonexistent.field }}');
      });

      it('should return key as-is when template syntax is malformed', () => {
        const settings: ConcurrencySettings = {
          key: '{{ invalid syntax }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        // If template evaluation fails, treat as static string (user may have intended literal text)
        expect(result).toBe('{{ invalid syntax }}');
      });
    });

    describe('edge cases', () => {
      it('should return null for key with only whitespace', () => {
        const settings: ConcurrencySettings = {
          key: '   ',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
        expect(result).toBeNull(); // Whitespace is trimmed, empty string returns null
      });

      it('should handle numeric template result', () => {
        const contextWithNumber = {
          ...mockContext,
          inputs: {
            serverId: 123,
          },
        };
        const settings: ConcurrencySettings = {
          key: '{{ inputs.serverId }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithNumber);
        expect(result).toBe('123');
      });

      it('should handle boolean template result', () => {
        const contextWithBoolean = {
          ...mockContext,
          inputs: {
            isProduction: true,
          },
        };
        const settings: ConcurrencySettings = {
          key: '{{ inputs.isProduction }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithBoolean);
        expect(result).toBe('true');
      });

      it('should trim template result', () => {
        const contextWithSpaces = {
          ...mockContext,
          inputs: {
            serverName: '  mamba  ',
          },
        };
        const settings: ConcurrencySettings = {
          key: '{{ inputs.serverName }}',
        };
        const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithSpaces);
        expect(result).toBe('mamba');
      });
    });
  });
});
