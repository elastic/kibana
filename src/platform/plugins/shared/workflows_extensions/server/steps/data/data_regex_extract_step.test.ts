/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OrStringRecursive } from '@kbn/utility-types';
import { dataRegexExtractStepDefinition } from './data_regex_extract_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataRegexExtractStepDefinition', () => {
  const createMockContext = (
    config: {
      source: unknown;
      errorIfNoMatch?: boolean;
    },
    input: {
      pattern: string;
      fields: Record<string, string>;
      flags?: string;
    }
  ): StepHandlerContext<any, any> => ({
    config,
    input,
    rawInput: input as OrStringRecursive<{ pattern: string; fields: Record<string, string> }>,
    contextManager: {
      getContext: jest.fn(),
      renderInputTemplate: jest.fn((val) => val),
      getScopedEsClient: jest.fn(),
      getFakeRequest: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'data.regex_extract',
  });

  describe('named capture groups', () => {
    it('should extract fields using named capture groups', async () => {
      const config = {
        source: '2024-01-15 ERROR Connection failed',
      };
      const input = {
        pattern: '^(?<timestamp>\\d{4}-\\d{2}-\\d{2}) (?<level>\\w+) (?<message>.*)',
        fields: {
          timestamp: 'timestamp',
          level: 'level',
          message: 'message',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual({
        timestamp: '2024-01-15',
        level: 'ERROR',
        message: 'Connection failed',
      });
    });

    it('should handle missing named groups by returning null', async () => {
      const config = {
        source: '2024-01-15 ERROR',
      };
      const input = {
        pattern: '^(?<timestamp>\\d{4}-\\d{2}-\\d{2}) (?<level>\\w+)',
        fields: {
          timestamp: 'timestamp',
          level: 'level',
          message: 'message',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual({
        timestamp: '2024-01-15',
        level: 'ERROR',
        message: null,
      });
    });
  });

  describe('numbered capture groups', () => {
    it('should extract fields using numbered groups', async () => {
      const config = {
        source: 'v1.2.3',
      };
      const input = {
        pattern: '(\\d+)\\.(\\d+)\\.(\\d+)',
        fields: {
          major: '$1',
          minor: '$2',
          patch: '$3',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual({
        major: '1',
        minor: '2',
        patch: '3',
      });
    });

    it('should handle invalid numbered group references', async () => {
      const config = {
        source: 'v1.2',
      };
      const input = {
        pattern: '(\\d+)\\.(\\d+)',
        fields: {
          major: '$1',
          minor: '$2',
          patch: '$3',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual({
        major: '1',
        minor: '2',
        patch: null,
      });
    });

    it('should handle non-numeric group references', async () => {
      const config = {
        source: 'test',
      };
      const input = {
        pattern: '(\\w+)',
        fields: {
          value: '$abc',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual({
        value: null,
      });
    });
  });

  describe('array processing', () => {
    it('should process array of strings', async () => {
      const config = {
        source: ['[INFO] Started', '[ERROR] Failed', '[WARN] Slow'],
      };
      const input = {
        pattern: '\\[(?<level>\\w+)\\] (?<message>.*)',
        fields: {
          level: 'level',
          message: 'message',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual([
        { level: 'INFO', message: 'Started' },
        { level: 'ERROR', message: 'Failed' },
        { level: 'WARN', message: 'Slow' },
      ]);
    });

    it('should handle mixed array with non-matching items', async () => {
      const config = {
        source: ['ID: 123', 'no match here', 'ID: 456'],
      };
      const input = {
        pattern: 'ID: (\\d+)',
        fields: {
          id: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual([{ id: '123' }, null, { id: '456' }]);
    });

    it('should handle array with non-string items', async () => {
      const config = {
        source: ['valid string', 123, null, 'another string'],
      };
      const input = {
        pattern: '(\\w+)',
        fields: {
          word: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual([{ word: 'valid' }, null, null, { word: 'another' }]);
    });
  });

  describe('error handling', () => {
    it('should return null when no match and errorIfNoMatch is false', async () => {
      const config = {
        source: 'no match here',
        errorIfNoMatch: false,
      };
      const input = {
        pattern: 'ID: (\\d+)',
        fields: {
          id: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toBeNull();
    });

    it('should return error when no match and errorIfNoMatch is true', async () => {
      const config = {
        source: 'no match here',
        errorIfNoMatch: true,
      };
      const input = {
        pattern: 'ID: (\\d+)',
        fields: {
          id: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('did not match');
    });

    it('should return error for invalid regex pattern', async () => {
      const config = {
        source: 'test',
      };
      const input = {
        pattern: '[invalid(',
        fields: {
          value: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid regex pattern');
    });

    it('should return error when source is null', async () => {
      const config = {
        source: null,
      };
      const input = {
        pattern: '(\\w+)',
        fields: {
          word: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Source cannot be null or undefined');
    });

    it('should return error when source is invalid type', async () => {
      const config = {
        source: 12345,
      };
      const input = {
        pattern: '(\\w+)',
        fields: {
          word: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected source to be a string or array');
    });

    it('should handle empty array', async () => {
      const config = {
        source: [],
      };
      const input = {
        pattern: '(\\w+)',
        fields: {
          word: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual([]);
    });
  });

  describe('regex flags', () => {
    it('should apply case-insensitive flag', async () => {
      const config = {
        source: 'ERROR: connection failed',
      };
      const input = {
        pattern: 'error: (.*)',
        fields: {
          message: '$1',
        },
        flags: 'i',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual({
        message: 'connection failed',
      });
    });

    it('should work without flags', async () => {
      const config = {
        source: 'test string',
      };
      const input = {
        pattern: '(\\w+)',
        fields: {
          word: '$1',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual({
        word: 'test',
      });
    });
  });

  describe('logging', () => {
    it('should log extraction statistics', async () => {
      const config = {
        source: ['match 1', 'match 2', 'match 3'],
      };
      const input = {
        pattern: '(\\w+)',
        fields: {
          word: '$1',
        },
      };

      const context = createMockContext(config, input);
      await dataRegexExtractStepDefinition.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Extracting from 3 item(s)')
      );
      expect(context.logger.debug).toHaveBeenCalledWith(expect.stringContaining('3 matches found'));
    });
  });

  describe('global flag behavior', () => {
    it('should correctly process multiple array items with global flag', async () => {
      const config = {
        source: ['test1', 'test2', 'test3'],
      };
      const input = {
        pattern: '(\\w+)(\\d+)',
        fields: {
          word: '$1',
          number: '$2',
        },
        flags: 'g',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual([
        { word: 'test', number: '1' },
        { word: 'test', number: '2' },
        { word: 'test', number: '3' },
      ]);
    });

    it('should not skip array items when using global flag', async () => {
      const config = {
        source: ['ID: 100', 'ID: 200', 'ID: 300', 'ID: 400'],
      };
      const input = {
        pattern: 'ID: (\\d+)',
        fields: {
          id: '$1',
        },
        flags: 'g',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toHaveLength(4);
      expect(result.output).toEqual([{ id: '100' }, { id: '200' }, { id: '300' }, { id: '400' }]);
    });

    it('should extract from each array item independently with global flag', async () => {
      const config = {
        source: [
          '2024-01-15 ERROR First error',
          '2024-01-16 INFO Some info',
          '2024-01-17 ERROR Second error',
        ],
      };
      const input = {
        pattern: '^(?<date>\\d{4}-\\d{2}-\\d{2}) (?<level>\\w+)',
        fields: {
          date: 'date',
          level: 'level',
        },
        flags: 'g',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual([
        { date: '2024-01-15', level: 'ERROR' },
        { date: '2024-01-16', level: 'INFO' },
        { date: '2024-01-17', level: 'ERROR' },
      ]);
    });

    it('should handle multiline flag correctly across array items', async () => {
      const config = {
        source: ['line1\nline2', 'start\nmiddle\nend', 'single'],
      };
      const input = {
        pattern: '^(\\w+)',
        fields: {
          first: '$1',
        },
        flags: 'm',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.output).toEqual([{ first: 'line1' }, { first: 'start' }, { first: 'single' }]);
    });

    it('should not be affected by regex state across iterations', async () => {
      const config = {
        source: ['abc123', 'def456', 'ghi789', 'jkl012'],
      };
      const input = {
        pattern: '([a-z]+)(\\d+)',
        fields: {
          letters: '$1',
          digits: '$2',
        },
        flags: 'g',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(Array.isArray(result.output)).toBe(true);
      const output = result.output as Array<Record<string, unknown> | null>;
      expect(output).toHaveLength(4);
      expect(output[0]).toEqual({ letters: 'abc', digits: '123' });
      expect(output[1]).toEqual({ letters: 'def', digits: '456' });
      expect(output[2]).toEqual({ letters: 'ghi', digits: '789' });
      expect(output[3]).toEqual({ letters: 'jkl', digits: '012' });
    });
  });

  describe('pattern length validation', () => {
    it('should reject patterns exceeding 10,000 characters', async () => {
      const config = {
        source: 'test string',
        errorIfNoMatch: false,
      };
      const input = {
        pattern: 'a'.repeat(10001),
        fields: { result: '$0' },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('exceeds maximum allowed length');
      expect(result.error?.message).toContain('10000');
    });

    it('should accept patterns at exactly 10,000 characters', async () => {
      const config = {
        source: 'test string',
        errorIfNoMatch: false,
      };
      const input = {
        pattern: 'a'.repeat(10000),
        fields: { result: '$0' },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeUndefined();
      expect(result.output).toBeDefined();
    });

    it('should accept normal length patterns', async () => {
      const config = {
        source: 'test string',
        errorIfNoMatch: false,
      };
      const input = {
        pattern: '^[a-z]+$',
        fields: { result: '$0' },
      };

      const context = createMockContext(config, input);
      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeUndefined();
      expect(result.output).toBeDefined();
    });
  });

  describe('abort signal handling', () => {
    it('should stop processing when abort signal is triggered', async () => {
      const abortController = new AbortController();
      const config = {
        source: ['item1', 'item2', 'item3', 'item4', 'item5'],
        errorIfNoMatch: false,
      };
      const input = {
        pattern: '(\\w+)',
        fields: { word: '$1' },
      };

      const context = createMockContext(config, input);

      // Abort immediately before processing
      abortController.abort();
      context.abortSignal = abortController.signal;

      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Operation cancelled');
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Regex extraction cancelled via abort signal'
      );
    });

    it('should complete normally when abort signal is not triggered', async () => {
      const abortController = new AbortController();
      const config = {
        source: ['test1', 'test2'],
        errorIfNoMatch: false,
      };
      const input = {
        pattern: '(\\w+)',
        fields: { word: '$1' },
      };

      const context = createMockContext(config, input);
      context.abortSignal = abortController.signal;

      const result = await dataRegexExtractStepDefinition.handler(context);

      expect(result.error).toBeUndefined();
      expect(Array.isArray(result.output)).toBe(true);
    });
  });
});
