/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createRegex,
  detectRedosPatterns,
  MAX_ARRAY_LENGTH,
  MAX_INPUT_LENGTH,
  MAX_PATTERN_LENGTH,
  validateInputLength,
  validateSourceInput,
} from './regex_utils';

describe('regex_utils', () => {
  describe('validateInputLength', () => {
    const mockLogger = {
      warn: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should accept strings below max length', () => {
      const result = validateInputLength('short string', mockLogger);

      expect(result.valid).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should accept strings at exactly max length', () => {
      const exactLength = 'a'.repeat(MAX_INPUT_LENGTH);
      const result = validateInputLength(exactLength, mockLogger);

      expect(result.valid).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should reject strings exceeding max length', () => {
      const tooLong = 'a'.repeat(MAX_INPUT_LENGTH + 1);
      const result = validateInputLength(tooLong, mockLogger);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('exceeds maximum allowed length');
        expect(result.error.message).toContain('100000');
        expect(result.error.message).toContain('ReDoS');
      }
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('exceeds max length'));
    });

    it('should include actual length in error message', () => {
      const tooLong = 'a'.repeat(150000);
      const result = validateInputLength(tooLong, mockLogger);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.message).toContain('150000');
      }
    });

    it('should accept empty strings', () => {
      const result = validateInputLength('', mockLogger);

      expect(result.valid).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('detectRedosPatterns', () => {
    it('should detect nested quantifiers', () => {
      const patterns = ['(a+)+', '(a*)*', '(a?)+', '(\\d+)+', '([a-z]*)*'];

      patterns.forEach((pattern) => {
        const error = detectRedosPatterns(pattern);
        expect(error).toBeDefined();
        expect(error?.message).toContain('nested quantifiers');
        expect(error?.message).toContain('ReDoS');
      });
    });

    it('should detect overlapping alternations with quantifiers', () => {
      const patterns = ['(a|aa)+', '(a|ab)+', '(abc|abcd)*', '(x|xy|xyz)+'];

      patterns.forEach((pattern) => {
        const error = detectRedosPatterns(pattern);
        expect(error).toBeDefined();
        expect(error?.message).toContain('overlapping alternations');
        expect(error?.message).toContain('ReDoS');
      });
    });

    it('should detect nested quantifiers with end anchor', () => {
      const patterns = ['(a+)+$', '(\\d*)*$', '(test?)+$'];

      patterns.forEach((pattern) => {
        const error = detectRedosPatterns(pattern);
        expect(error).toBeDefined();
        expect(error?.message).toContain('end anchor');
        expect(error?.message).toContain('ReDoS');
      });
    });

    it('should detect multiple consecutive quantifiers', () => {
      const patterns = ['a++', 'b**', 'c*+', 'd+*', 'e{2,3}{4,5}'];

      patterns.forEach((pattern) => {
        const error = detectRedosPatterns(pattern);
        expect(error).toBeDefined();
        expect(error?.message).toContain('multiple consecutive quantifiers');
        expect(error?.message).toContain('ReDoS');
      });
    });

    it('should allow safe patterns', () => {
      const safePatterns = [
        '\\d+',
        '[a-z]+',
        '(abc)+',
        '^test$',
        '\\w{2,5}',
        '(foo|bar)',
        '(?:non|capturing)+',
        '^\\d{4}-\\d{2}-\\d{2}$',
        '[A-Z][a-z]*',
      ];

      safePatterns.forEach((pattern) => {
        const error = detectRedosPatterns(pattern);
        expect(error).toBeUndefined();
      });
    });

    it('should allow non-overlapping alternations', () => {
      const safePatterns = ['(cat|dog)+', '(red|blue|green)*', '(foo|bar|baz)+'];

      safePatterns.forEach((pattern) => {
        const error = detectRedosPatterns(pattern);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('createRegex', () => {
    const mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create valid regex without flags', () => {
      const result = createRegex('\\d+', undefined, mockLogger);

      expect('regex' in result).toBe(true);
      if ('regex' in result) {
        expect(result.regex).toBeInstanceOf(RegExp);
        expect(result.regex.source).toBe('\\d+');
        expect(result.regex.flags).toBe('');
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should create valid regex with flags', () => {
      const result = createRegex('test', 'gi', mockLogger);

      expect('regex' in result).toBe(true);
      if ('regex' in result) {
        expect(result.regex).toBeInstanceOf(RegExp);
        expect(result.regex.source).toBe('test');
        expect(result.regex.flags).toBe('gi');
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle complex patterns', () => {
      const result = createRegex(
        '^(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})$',
        'i',
        mockLogger
      );

      expect('regex' in result).toBe(true);
      if ('regex' in result) {
        expect(result.regex).toBeInstanceOf(RegExp);
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should reject patterns exceeding max length', () => {
      const tooLongPattern = 'a'.repeat(MAX_PATTERN_LENGTH + 1);
      const result = createRegex(tooLongPattern, undefined, mockLogger);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('exceeds maximum allowed length');
        expect(result.error.message).toContain('10000');
        expect(result.error.message).toContain('10001');
      }
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Pattern length limit exceeded',
        expect.any(Error)
      );
    });

    it('should accept patterns at max length', () => {
      const maxLengthPattern = 'a'.repeat(MAX_PATTERN_LENGTH);
      const result = createRegex(maxLengthPattern, undefined, mockLogger);

      expect('regex' in result).toBe(true);
      if ('regex' in result) {
        expect(result.regex).toBeInstanceOf(RegExp);
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should reject patterns with ReDoS vulnerabilities', () => {
      const dangerousPatterns = ['(a+)+', '(a|aa)+', '(\\d+)+$', 'test++'];

      dangerousPatterns.forEach((pattern) => {
        jest.clearAllMocks();
        const result = createRegex(pattern, undefined, mockLogger);

        expect('error' in result).toBe(true);
        if ('error' in result) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toContain('ReDoS');
        }
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Dangerous regex pattern rejected',
          expect.any(Error)
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('ReDoS pattern detected')
        );
      });
    });

    it('should reject invalid regex patterns', () => {
      const result = createRegex('[invalid(', undefined, mockLogger);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Invalid regex pattern');
        expect(result.error.message).toContain('[invalid(');
      }
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid regex pattern', expect.any(Error));
    });

    it('should reject unclosed groups', () => {
      const result = createRegex('(unclosed', undefined, mockLogger);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.message).toContain('Invalid regex pattern');
      }
    });

    it('should reject invalid flags', () => {
      const result = createRegex('test', 'xyz', mockLogger);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.message).toContain('Invalid regex pattern');
      }
    });

    it('should handle empty pattern', () => {
      const result = createRegex('', undefined, mockLogger);

      expect('regex' in result).toBe(true);
      if ('regex' in result) {
        expect(result.regex.source).toBe('(?:)');
      }
    });

    it('should handle all common flags', () => {
      const result = createRegex('test', 'gimsuyd', mockLogger);

      expect('regex' in result).toBe(true);
      if ('regex' in result) {
        expect(result.regex.flags).toBe('dgimsuy');
      }
    });
  });

  describe('validateSourceInput', () => {
    const mockLogger = {
      error: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should accept string input', () => {
      const result = validateSourceInput('test string', mockLogger);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.isArray).toBe(false);
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should accept array input', () => {
      const result = validateSourceInput(['item1', 'item2'], mockLogger);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.isArray).toBe(true);
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should accept empty string', () => {
      const result = validateSourceInput('', mockLogger);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.isArray).toBe(false);
      }
    });

    it('should accept empty array', () => {
      const result = validateSourceInput([], mockLogger);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.isArray).toBe(true);
      }
    });

    it('should reject arrays exceeding max length', () => {
      const tooLargeArray = new Array(MAX_ARRAY_LENGTH + 1).fill('test');
      const mockLoggerWithWarn = {
        error: jest.fn(),
        warn: jest.fn(),
      };
      const result = validateSourceInput(tooLargeArray, mockLoggerWithWarn);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('exceeds maximum allowed length');
        expect(result.error.message).toContain('10000');
        expect(result.error.message).toContain('10001');
      }
      expect(mockLoggerWithWarn.warn).toHaveBeenCalledWith(
        expect.stringContaining('Input array exceeds max length')
      );
      expect(mockLoggerWithWarn.error).toHaveBeenCalledWith(
        'Input array exceeds maximum allowed length'
      );
    });

    it('should accept arrays at max length', () => {
      const maxLengthArray = new Array(MAX_ARRAY_LENGTH).fill('test');
      const result = validateSourceInput(maxLengthArray, mockLogger);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.isArray).toBe(true);
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should accept normal sized arrays', () => {
      const normalArray = ['item1', 'item2', 'item3'];
      const result = validateSourceInput(normalArray, mockLogger);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.isArray).toBe(true);
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should reject null input', () => {
      const result = validateSourceInput(null, mockLogger);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('cannot be null or undefined');
      }
      expect(mockLogger.error).toHaveBeenCalledWith('Input source is null or undefined');
    });

    it('should reject undefined input', () => {
      const result = validateSourceInput(undefined, mockLogger);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.message).toContain('cannot be null or undefined');
      }
    });

    it('should reject number input', () => {
      const result = validateSourceInput(12345, mockLogger);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.message).toContain('Expected source to be a string or array');
        expect(result.error.message).toContain('number');
      }
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('invalid type: number')
      );
    });

    it('should reject boolean input', () => {
      const result = validateSourceInput(true, mockLogger);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.message).toContain('boolean');
      }
    });

    it('should reject object input', () => {
      const result = validateSourceInput({ key: 'value' }, mockLogger);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.message).toContain('object');
      }
    });

    it('should accept array with mixed types', () => {
      const result = validateSourceInput(['string', 123, null], mockLogger);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.isArray).toBe(true);
      }
    });
  });

  describe('MAX_INPUT_LENGTH constant', () => {
    it('should be set to 100000', () => {
      expect(MAX_INPUT_LENGTH).toBe(100000);
    });
  });
});
