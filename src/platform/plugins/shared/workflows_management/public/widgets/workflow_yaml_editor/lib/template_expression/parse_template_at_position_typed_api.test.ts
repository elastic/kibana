/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Regression / correctness tests for the B2 + B4 refactor:
 *  B2 — replaced `token as any` + constructor-name sniff with `instanceof Output`
 *  B4 — replaced `expression.split('|')` filter extraction with `token.value.filters.map(f => f.name)`
 *
 * The existing tests in parse_template_at_position.test.ts confirm that all previously
 * tested behaviours are preserved after the refactor (they pass unchanged).
 *
 * This file adds:
 * 1. Cases that were *already correct* under both old and new code — explicitly marking them
 *    as regressions to guard the refactor.
 * 2. A case that was *wrong* under the old string-split but is *correct* under the AST-based
 *    extraction (filter with a literal `|` in its string argument), to prove the refactor
 *    strictly improves correctness.
 */

import { monaco } from '@kbn/monaco';
import { parseTemplateAtPosition } from './parse_template_at_position';

// Shared mock helpers (mirrors parse_template_at_position.test.ts helpers,
// but defined here independently to avoid importing from the test file)
function createMockModel(content: string): monaco.editor.ITextModel {
  return {
    getLineContent: (lineNumber: number) => {
      const lines = content.split('\n');
      return lines[lineNumber - 1] || '';
    },
  } as monaco.editor.ITextModel;
}

function createPosition(lineNumber: number, column: number): monaco.Position {
  return new monaco.Position(lineNumber, column);
}

describe('parseTemplateAtPosition — typed Output + AST filter extraction (B2/B4)', () => {
  // -----------------------------------------------------------------------
  // B2 regression: instanceof Output correctly identifies Output tokens
  // -----------------------------------------------------------------------
  describe('B2 — typed token recognition via instanceof Output', () => {
    it('correctly identifies an output token and returns isInsideTemplate=true', () => {
      // Verifies that the instanceof Output check matches the same tokens the old
      // constructor.name === "Output" check matched.
      const model = createMockModel('{{ steps.a.output }}');
      const result = parseTemplateAtPosition(model, createPosition(1, 5));
      expect(result?.isInsideTemplate).toBe(true);
      expect(result?.variablePath).toBe('steps.a.output');
    });

    it('returns null for plain text (no output token at cursor position)', () => {
      const model = createMockModel('just plain text');
      const result = parseTemplateAtPosition(model, createPosition(1, 5));
      expect(result).toBeNull();
    });

    it('returns null when cursor is outside the {{ }} delimiters', () => {
      const model = createMockModel('prefix {{ steps.a }} suffix');
      // cursor before {{ (column 1)
      expect(parseTemplateAtPosition(model, createPosition(1, 1))).toBeNull();
      // cursor after }} (column 25+)
      expect(parseTemplateAtPosition(model, createPosition(1, 25))).toBeNull();
    });

    it('correctly reads begin/end from the OutputToken (token.token.begin/end)', () => {
      // The tokenStart/tokenEnd bounds are used to decide if cursor is inside.
      // Cursor right at the opening {{ is inside; the char before it is not.
      const line = 'pre {{ steps.x }} post';
      //                 ^4 ^5 (0-indexed)  =>  column 5 (1-indexed) is on '{'
      const model = createMockModel(line);
      // column 5 = first '{' of '{{', 0-indexed offset 4 → inside token
      expect(parseTemplateAtPosition(model, createPosition(1, 5))?.isInsideTemplate).toBe(true);
      // column 4 = 'e' of 'pre', offset 3 → outside token
      expect(parseTemplateAtPosition(model, createPosition(1, 4))).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // B4 regression: filter names from AST (token.value.filters)
  // -----------------------------------------------------------------------
  describe('B4 — filter extraction via token.value.filters', () => {
    it('regression: extracts a single filter name correctly', () => {
      // 'upcase' — same result under both old and new code.
      const model = createMockModel('{{ x | upcase }}');
      const result = parseTemplateAtPosition(model, createPosition(1, 4));
      expect(result?.filters).toEqual(['upcase']);
    });

    it('regression: extracts multiple filter names in order', () => {
      // 'json | upcase' — same result under both old and new code.
      const model = createMockModel('{{ data | json | upcase }}');
      const result = parseTemplateAtPosition(model, createPosition(1, 4));
      expect(result?.filters).toEqual(['json', 'upcase']);
    });

    it('regression: strips argument from filter name (truncate: 5 → "truncate")', () => {
      // old: ".split(':')[0].trim()" • new: "f.name" (already just the name)
      const model = createMockModel('{{ x | truncate: 5 }}');
      const result = parseTemplateAtPosition(model, createPosition(1, 4));
      expect(result?.filters).toEqual(['truncate']);
    });

    it('regression: handles filter with multiple arguments correctly', () => {
      const model = createMockModel("{{ x | truncate: 10, '...' }}");
      const result = parseTemplateAtPosition(model, createPosition(1, 4));
      expect(result?.filters).toEqual(['truncate']);
    });

    it('regression: returns empty filters when no pipe is present', () => {
      const model = createMockModel('{{ steps.a.value }}');
      const result = parseTemplateAtPosition(model, createPosition(1, 4));
      expect(result?.filters).toEqual([]);
    });

    /**
     * NEW CORRECTNESS CASE (B4 improvement over string-split):
     *
     * When a filter argument contains a literal pipe character inside a quoted string,
     * the old `expression.split('|')` approach would split on the pipe inside the
     * string and produce garbage filter names (e.g. ["replace: 'a", "b', 'c'"]).
     *
     * The AST-based approach (`token.value.filters.map(f => f.name)`) reads the filter
     * name directly from the parsed token, so it correctly returns ["replace"].
     */
    it('correctly extracts filter name when a string argument contains a literal pipe', () => {
      // "replace: 'a|b', 'c'" — the '|' is inside a quoted string, not a filter separator.
      // Old string-split code would yield: ["replace: 'a", "b', 'c'"] (wrong).
      // New AST code yields: ["replace"] (correct).
      const model = createMockModel("{{ x | replace: 'a|b', 'c' }}");
      const result = parseTemplateAtPosition(model, createPosition(1, 4));
      expect(result?.filters).toEqual(['replace']);
    });

    it('correctly extracts filter name when a double-quoted argument contains a pipe', () => {
      const model = createMockModel('{{ x | replace: "a|b", "c" }}');
      const result = parseTemplateAtPosition(model, createPosition(1, 4));
      expect(result?.filters).toEqual(['replace']);
    });

    it('regression: variablePath is correctly split from expression when filters are present', () => {
      // variable path extraction still uses the pipe index from the expression string —
      // this regression verifies the path is not broken by the filter change.
      const model = createMockModel('{{ steps.s.output | upcase | downcase }}');
      const result = parseTemplateAtPosition(model, createPosition(1, 10));
      expect(result?.variablePath).toBe('steps.s.output');
      expect(result?.filters).toEqual(['upcase', 'downcase']);
      expect(result?.isOnFilter).toBe(false);
    });

    it('regression: isOnFilter=true when cursor is on the filter part', () => {
      const model = createMockModel('{{ x | upcase }}');
      // column 10 is on 'upcase' (0-indexed: offset 9, after the '| ')
      const result = parseTemplateAtPosition(model, createPosition(1, 10));
      expect(result?.isOnFilter).toBe(true);
      expect(result?.filters).toEqual(['upcase']);
    });
  });
});
