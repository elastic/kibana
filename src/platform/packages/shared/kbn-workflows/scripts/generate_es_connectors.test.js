/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Tests for the Elasticsearch connector generator script
 *
 * This tests the core logic that converts Console API definitions
 * into Zod schema strings for workflow validation.
 */

// Helper function to extract and evaluate the convertUrlParamToZodString function
function getConvertUrlParamToZodString() {
  const fs = require('fs');
  const path = require('path');

  const scriptPath = path.join(__dirname, 'generate_es_connectors.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');

  // Extract the convertUrlParamToZodString function
  const functionMatch = scriptContent.match(
    /function convertUrlParamToZodString\(paramName, paramValue, isRequired = false\) \{[\s\S]*?\n\}/
  );

  if (!functionMatch) {
    throw new Error('Could not extract convertUrlParamToZodString function from script');
  }

  // Create a function in an isolated scope
  // eslint-disable-next-line no-new-func
  return new Function(`return ${functionMatch[0]}`)();
}

describe('generate_es_connectors', () => {
  let convertUrlParamToZodString;

  beforeAll(() => {
    convertUrlParamToZodString = getConvertUrlParamToZodString();
  });

  describe('convertUrlParamToZodString', () => {
    describe('Boolean flags', () => {
      it('should handle __flag__ as boolean', () => {
        const result = convertUrlParamToZodString('test_flag', '__flag__');
        expect(result).toContain('z.boolean()');
        expect(result).toContain('.optional()');
        expect(result).toContain('Boolean flag: test_flag');
      });

      it('should handle required flags without .optional()', () => {
        const result = convertUrlParamToZodString('required_flag', '__flag__', true);
        expect(result).toContain('z.boolean()');
        expect(result).not.toContain('.optional()');
        expect(result).toContain('(required)');
      });
    });

    describe('Empty arrays - the bug fix', () => {
      it('should use z.unknown() for empty arrays (unknown allowed values)', () => {
        const result = convertUrlParamToZodString('sort', []);
        expect(result).toContain('z.unknown()');
        expect(result).toContain('.optional()');
        expect(result).toContain('Parameter: sort');
      });

      it('should NOT use z.array(z.string()) for empty arrays', () => {
        const result = convertUrlParamToZodString('sort', []);
        expect(result).not.toContain('z.array(z.string())');
      });

      it('should handle required empty array parameters', () => {
        const result = convertUrlParamToZodString('required_param', [], true);
        expect(result).toContain('z.unknown()');
        expect(result).not.toContain('.optional()');
        expect(result).toContain('(required)');
      });

      it('should apply to all parameters with empty arrays', () => {
        const params = ['sort', 'filter_path', 'stored_fields', 'docvalue_fields'];

        for (const param of params) {
          const result = convertUrlParamToZodString(param, []);
          expect(result).toContain('z.unknown()');
          expect(result).toContain(`Parameter: ${param}`);
        }
      });
    });

    describe('String enum arrays', () => {
      it('should handle array of string values as enum', () => {
        const result = convertUrlParamToZodString('order', ['asc', 'desc']);
        expect(result).toContain("z.enum(['asc', 'desc'])");
        expect(result).toContain('.optional()');
      });

      it('should handle expand_wildcards enum', () => {
        const result = convertUrlParamToZodString('expand_wildcards', [
          'all',
          'open',
          'closed',
          'hidden',
          'none',
        ]);
        expect(result).toContain('z.enum([');
        expect(result).toContain("'all'");
        expect(result).toContain("'open'");
        expect(result).toContain("'closed'");
      });
    });

    describe('Numeric arrays', () => {
      it('should handle numeric arrays with union type', () => {
        const result = convertUrlParamToZodString('size', ['10', '20', '50']);
        expect(result).toContain('z.union([z.number(), z.array(z.number())');
        expect(result).toContain("z.enum(['10', '20', '50'])");
      });

      it('should handle single numeric value', () => {
        const result = convertUrlParamToZodString('timeout', ['-1', '0']);
        expect(result).toContain('z.union([z.number(), z.array(z.number())');
        expect(result).toContain("z.enum(['-1', '0'])");
      });
    });

    describe('String parameters', () => {
      it('should handle string parameters', () => {
        const result = convertUrlParamToZodString('query', 'test');
        expect(result).toContain('z.string()');
        expect(result).toContain('.optional()');
        expect(result).toContain('String parameter:');
      });

      it('should handle required string parameters', () => {
        const result = convertUrlParamToZodString('index', 'test', true);
        expect(result).toContain('z.string()');
        expect(result).not.toContain('.optional()');
        expect(result).toContain('(required)');
      });

      it('should handle numeric string parameters with union type', () => {
        const result = convertUrlParamToZodString('port', '8080', false);
        expect(result).toContain('z.union([z.string(), z.number()])');
        expect(result).toContain('.optional()');
      });
    });

    describe('Required vs Optional', () => {
      it('should add .optional() for optional parameters', () => {
        const result = convertUrlParamToZodString('optional_param', 'test', false);
        expect(result).toContain('.optional()');
        expect(result).not.toContain('(required)');
      });

      it('should NOT add .optional() for required parameters', () => {
        const result = convertUrlParamToZodString('required_param', 'test', true);
        expect(result).not.toContain('.optional()');
        expect(result).toContain('(required)');
      });
    });
  });

  describe('Real-world parameter scenarios', () => {
    it('should correctly handle the sort parameter that caused the bug', () => {
      // This is the actual parameter from search.json that was failing
      const sortResult = convertUrlParamToZodString('sort', []);

      // Should be fully permissive since we don't know what Elasticsearch accepts
      expect(sortResult).toContain('z.unknown()');

      // Should allow all these formats (validated at runtime):
      // - string: "field"
      // - array of strings: ["field1", "field2"]
      // - array of objects: [{"field": "asc"}]
      // - array of complex objects: [{"field": {"order": "desc", "mode": "avg"}}]
    });

    it('should handle filter_path parameter', () => {
      const result = convertUrlParamToZodString('filter_path', []);
      expect(result).toContain('z.unknown()');
    });

    it('should handle _source_excludes/_includes parameters', () => {
      const excludes = convertUrlParamToZodString('_source_excludes', []);
      const includes = convertUrlParamToZodString('_source_includes', []);

      expect(excludes).toContain('z.unknown()');
      expect(includes).toContain('z.unknown()');
    });

    it('should handle stored_fields parameter', () => {
      const result = convertUrlParamToZodString('stored_fields', []);
      expect(result).toContain('z.unknown()');
    });

    it('should handle docvalue_fields parameter', () => {
      const result = convertUrlParamToZodString('docvalue_fields', []);
      expect(result).toContain('z.unknown()');
    });
  });

  describe('Semantic correctness - z.unknown() vs z.any()', () => {
    it('should use z.unknown() to enforce type safety', () => {
      // z.unknown() is semantically correct because:
      // 1. We genuinely don't know what type Elasticsearch accepts
      // 2. It forces consumers to validate before using
      // 3. It's safer than z.any() which bypasses all validation

      const result = convertUrlParamToZodString('unknown_param', []);
      expect(result).toContain('z.unknown()');
      expect(result).not.toContain('z.any()');
    });

    it('should express "we don\'t know" rather than "we don\'t care"', () => {
      // z.unknown() says "I accept anything but YOU must check the type"
      // z.any() says "I accept anything and you can do anything with it"
      // For empty arrays in Console definitions, z.unknown() is correct

      const result = convertUrlParamToZodString('test', []);
      expect(result).toContain('z.unknown()');
    });
  });

  describe('Documentation strings', () => {
    it('should include descriptive text for parameters', () => {
      const result = convertUrlParamToZodString('sort', []);
      expect(result).toContain('.describe(');
      expect(result).toContain('Parameter: sort');
    });

    it('should mark required parameters in description', () => {
      const result = convertUrlParamToZodString('index', 'test', true);
      expect(result).toContain('(required)');
    });

    it('should distinguish between parameter types in description', () => {
      const flag = convertUrlParamToZodString('test', '__flag__');
      const array = convertUrlParamToZodString('test', []);
      const string = convertUrlParamToZodString('test', 'value');

      expect(flag).toContain('Boolean flag');
      expect(array).toContain('Parameter:');
      expect(string).toContain('String parameter:');
    });
  });

  describe('Regression prevention', () => {
    it('should never generate z.array(z.string()) for empty arrays', () => {
      // This was the original bug - being too restrictive
      const params = [
        'sort',
        'filter_path',
        'stored_fields',
        'docvalue_fields',
        '_source_excludes',
        '_source_includes',
      ];

      for (const param of params) {
        const result = convertUrlParamToZodString(param, []);
        expect(result).not.toContain('z.array(z.string())');
        expect(result).toContain('z.unknown()');
      }
    });

    it('should maintain the "be permissive for unknown types" principle', () => {
      // When Console definitions don't know what values are allowed (empty array),
      // we should be permissive rather than restrictive

      const result = convertUrlParamToZodString('unknown_type', []);

      // Should accept anything
      expect(result).toContain('z.unknown()');

      // Should NOT be overly specific
      expect(result).not.toContain('z.array(z.string())');
      expect(result).not.toContain('z.string()');
      expect(result).not.toContain('z.number()');
    });
  });
});
