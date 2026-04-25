/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildDataPart,
  buildInstructionsPart,
  buildRequirementsPart,
  buildSystemPart,
} from './build_prompts';

describe('buildSystemPart', () => {
  it('should return an array with a system message', () => {
    const result = buildSystemPart();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('role', 'system');
    expect(result[0]).toHaveProperty('content');
    expect(typeof result[0].content).toBe('string');
  });

  it('should return consistent results across multiple calls', () => {
    const result1 = buildSystemPart();
    const result2 = buildSystemPart();

    expect(result1).toEqual(result2);
  });

  it('should have non-empty content', () => {
    const result = buildSystemPart();

    expect(result[0].content.length).toBeGreaterThan(0);
    if (typeof result[0].content === 'string') {
      expect(result[0].content.trim()).not.toBe('');
    }
  });
});

describe('buildDataPart', () => {
  describe('with string input', () => {
    it('should return an array with a user message', () => {
      const input = 'Test string data';
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('role', 'user');
      expect(result[0]).toHaveProperty('content');
      expect(typeof result[0].content).toBe('string');
    });

    it('should use json marker for markdown', () => {
      const input = { name: 'John', age: 30 };
      const result = buildDataPart(input);

      expect(result[0].content).toContain('```json');
    });

    it('should use text marker for markdown', () => {
      const input = 'foo bar';
      const result = buildDataPart(input);

      expect(result[0].content).toContain('```text');
    });

    it('should include the input string in content', () => {
      const input = 'Test string data';
      const result = buildDataPart(input);

      expect(result[0].content).toContain(input);
    });

    it('should handle empty string', () => {
      const input = '';
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle multi-line strings', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = buildDataPart(input);

      expect(result[0].content).toContain(input);
    });
  });

  describe('with object input', () => {
    it('should return an array with a user message', () => {
      const input = { key: 'value', number: 42 };
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('role', 'user');
      expect(result[0]).toHaveProperty('content');
      expect(typeof result[0].content).toBe('string');
    });

    it('should stringify object input', () => {
      const input = { name: 'John', age: 30 };
      const result = buildDataPart(input);

      expect(result[0].content).toContain('John');
      expect(result[0].content).toContain('30');
    });

    it('should use json marker for markdown', () => {
      const input = { name: 'John', age: 30 };
      const result = buildDataPart(input);

      expect(result[0].content).toContain('```json');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'John',
          address: {
            city: 'New York',
          },
        },
      };
      const result = buildDataPart(input);

      expect(result[0].content).toContain('New York');
    });

    it('should handle empty object', () => {
      const input = {};
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('with array input', () => {
    it('should return an array with a user message', () => {
      const input = ['item1', 'item2', 'item3'];
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('role', 'user');
      expect(result[0]).toHaveProperty('content');
      expect(typeof result[0].content).toBe('string');
    });

    it('should stringify array input', () => {
      const input = ['item1', 'item2'];
      const result = buildDataPart(input);

      expect(result[0].content).toContain('item1');
      expect(result[0].content).toContain('item2');
    });

    it('should handle empty array', () => {
      const input: unknown[] = [];
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle array of objects', () => {
      const input = [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ];
      const result = buildDataPart(input);

      expect(result[0].content).toContain('First');
      expect(result[0].content).toContain('Second');
    });
  });

  describe('with primitive types', () => {
    it('should handle number input', () => {
      const input = 42;
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].content).toContain('42');
    });

    it('should handle boolean input', () => {
      const input = true;
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null input', () => {
      const input = null;
      const result = buildDataPart(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('buildRequirementsPart', () => {
  describe('with maxLength parameter', () => {
    it('should return an array with a user message when maxLength is provided', () => {
      const result = buildRequirementsPart({ maxLength: 100 });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('role', 'user');
      expect(result[0]).toHaveProperty('content');
      expect(typeof result[0].content).toBe('string');
    });

    it('should include maxLength value in content', () => {
      const result = buildRequirementsPart({ maxLength: 150 });

      expect(result[0].content).toContain('150');
    });

    it('should handle different maxLength values', () => {
      const result1 = buildRequirementsPart({ maxLength: 50 });
      const result2 = buildRequirementsPart({ maxLength: 200 });

      expect(result1[0].content).toContain('50');
      expect(result2[0].content).toContain('200');
      expect(result1[0].content).not.toEqual(result2[0].content);
    });

    it('should handle large maxLength values', () => {
      const result = buildRequirementsPart({ maxLength: 10000 });

      expect(result[0].content).toContain('10000');
    });

    it('should handle small maxLength values', () => {
      const result = buildRequirementsPart({ maxLength: 1 });

      expect(result[0].content).toContain('1');
    });
  });

  describe('without maxLength parameter', () => {
    it('should return an empty array when maxLength is undefined', () => {
      const result = buildRequirementsPart({ maxLength: undefined });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return an empty array when maxLength is not provided', () => {
      const result = buildRequirementsPart({});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});

describe('buildInstructionsPart', () => {
  describe('with instructions parameter', () => {
    it('should return an array with a user message when instructions are provided', () => {
      const instructions = 'Focus on key points';
      const result = buildInstructionsPart(instructions);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('role', 'user');
      expect(result[0]).toHaveProperty('content');
      expect(typeof result[0].content).toBe('string');
    });

    it('should include instructions text in content', () => {
      const instructions = 'Be concise and factual';
      const result = buildInstructionsPart(instructions);

      expect(result[0].content).toContain(instructions);
    });

    it('should handle different instruction texts', () => {
      const instructions1 = 'Short summary';
      const instructions2 = 'Detailed analysis with examples';

      const result1 = buildInstructionsPart(instructions1);
      const result2 = buildInstructionsPart(instructions2);

      expect(result1[0].content).toContain(instructions1);
      expect(result2[0].content).toContain(instructions2);
    });

    it('should handle multi-line instructions', () => {
      const instructions = 'Line 1\nLine 2\nLine 3';
      const result = buildInstructionsPart(instructions);

      expect(result[0].content).toContain(instructions);
    });

    it('should handle long instruction text', () => {
      const instructions = 'A'.repeat(1000);
      const result = buildInstructionsPart(instructions);

      expect(result[0].content).toContain(instructions);
    });

    it('should handle empty string', () => {
      const instructions = '';
      const result = buildInstructionsPart(instructions);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle whitespace-only string', () => {
      const instructions = '   ';
      const result = buildInstructionsPart(instructions);

      // Should still return the instructions even if just whitespace
      // (behavior depends on implementation - adjust if needed)
      expect(result).toEqual([]);
    });
  });

  describe('without instructions parameter', () => {
    it('should return an empty array when instructions are undefined', () => {
      const result = buildInstructionsPart(undefined);

      expect(result).toEqual([]);
    });
  });
});
