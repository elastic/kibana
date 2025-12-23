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
});
