/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OrStringRecursive } from '@kbn/utility-types';
import { dataRegexReplaceStepDefinition } from './data_regex_replace_step';
import type { StepHandlerContext } from '../../step_registry/types';

describe('dataRegexReplaceStepDefinition', () => {
  const createMockContext = (
    config: {
      source: unknown;
      detailed?: boolean;
    },
    input: {
      pattern: string;
      replacement: string;
      flags?: string;
    }
  ): StepHandlerContext<any, any> => ({
    config,
    input,
    rawInput: input as OrStringRecursive<{ pattern: string; replacement: string }>,
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
  });

  describe('simple replacement', () => {
    it('should replace pattern in a single string', async () => {
      const config = {
        source: 'My password is secret',
      };
      const input = {
        pattern: '\\b(password|secret)\\b',
        replacement: '***',
        flags: 'gi',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toBe('My *** is ***');
    });

    it('should return original if no matches', async () => {
      const config = {
        source: 'No match here',
      };
      const input = {
        pattern: 'xyz',
        replacement: 'abc',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toBe('No match here');
    });
  });

  describe('backreferences', () => {
    it('should support numbered backreferences', async () => {
      const config = {
        source: '5551234567',
      };
      const input = {
        pattern: '(\\d{3})(\\d{3})(\\d{4})',
        replacement: '($1) $2-$3',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toBe('(555) 123-4567');
    });

    it('should support named group backreferences', async () => {
      const config = {
        source: '2024-01-15',
      };
      const input = {
        pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
        replacement: '$<month>/$<day>/$<year>',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toBe('01/15/2024');
    });
  });

  describe('array processing', () => {
    it('should process array of strings', async () => {
      const config = {
        source: ['user1@old.com', 'user2@old.com', 'user3@old.com'],
      };
      const input = {
        pattern: '@old\\.com',
        replacement: '@new.com',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toEqual(['user1@new.com', 'user2@new.com', 'user3@new.com']);
    });

    it('should handle array with no matches', async () => {
      const config = {
        source: ['test1', 'test2', 'test3'],
      };
      const input = {
        pattern: 'xyz',
        replacement: 'abc',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toEqual(['test1', 'test2', 'test3']);
    });

    it('should handle array with non-string items', async () => {
      const config = {
        source: ['string1', 123, null, 'string2'],
      };
      const input = {
        pattern: 'string',
        replacement: 'text',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toEqual(['text1', '123', 'null', 'text2']);
    });
  });

  describe('regex flags', () => {
    it('should apply global flag to replace all occurrences', async () => {
      const config = {
        source: 'foo foo foo',
      };
      const input = {
        pattern: 'foo',
        replacement: 'bar',
        flags: 'g',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toBe('bar bar bar');
    });

    it('should replace only first occurrence without global flag', async () => {
      const config = {
        source: 'foo foo foo',
      };
      const input = {
        pattern: 'foo',
        replacement: 'bar',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toBe('bar foo foo');
    });

    it('should apply case-insensitive flag', async () => {
      const config = {
        source: 'Error ERROR error',
      };
      const input = {
        pattern: 'error',
        replacement: 'warning',
        flags: 'gi',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toBe('warning warning warning');
    });

    it('should work without any flags', async () => {
      const config = {
        source: 'test string',
      };
      const input = {
        pattern: 'test',
        replacement: 'demo',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toBe('demo string');
    });
  });

  describe('detailed output mode', () => {
    it('should provide detailed output for single string', async () => {
      const config = {
        source: 'Error occurred. Another error found.',
        detailed: true,
      };
      const input = {
        pattern: 'error',
        replacement: 'warning',
        flags: 'gi',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toEqual({
        original: 'Error occurred. Another error found.',
        replaced: 'warning occurred. Another warning found.',
        matchCount: 2,
      });
    });

    it('should provide detailed output for array', async () => {
      const config = {
        source: ['foo bar', 'foo baz'],
        detailed: true,
      };
      const input = {
        pattern: 'foo',
        replacement: 'qux',
        flags: 'g',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toEqual({
        original: ['foo bar', 'foo baz'],
        replaced: ['qux bar', 'qux baz'],
        matchCount: 2,
      });
    });

    it('should show zero matches in detailed mode', async () => {
      const config = {
        source: 'no match here',
        detailed: true,
      };
      const input = {
        pattern: 'xyz',
        replacement: 'abc',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toEqual({
        original: 'no match here',
        replaced: 'no match here',
        matchCount: 0,
      });
    });
  });

  describe('error handling', () => {
    it('should return error for invalid regex pattern', async () => {
      const config = {
        source: 'test',
      };
      const input = {
        pattern: '[invalid(',
        replacement: 'valid',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid regex pattern');
    });

    it('should return error when source is null', async () => {
      const config = {
        source: null,
      };
      const input = {
        pattern: 'test',
        replacement: 'demo',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Source cannot be null or undefined');
    });

    it('should return error when source is invalid type', async () => {
      const config = {
        source: 12345,
      };
      const input = {
        pattern: 'test',
        replacement: 'demo',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected source to be a string or array');
    });

    it('should handle empty array', async () => {
      const config = {
        source: [],
      };
      const input = {
        pattern: 'test',
        replacement: 'demo',
      };

      const context = createMockContext(config, input);
      const result = await dataRegexReplaceStepDefinition.handler(context);

      expect(result.output).toEqual([]);
    });
  });

  describe('logging', () => {
    it('should log replacement statistics', async () => {
      const config = {
        source: ['foo bar', 'foo baz', 'foo qux'],
      };
      const input = {
        pattern: 'foo',
        replacement: 'bar',
        flags: 'g',
      };

      const context = createMockContext(config, input);
      await dataRegexReplaceStepDefinition.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Replacing in 3 item(s)')
      );
      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('3 matches replaced')
      );
    });
  });
});
