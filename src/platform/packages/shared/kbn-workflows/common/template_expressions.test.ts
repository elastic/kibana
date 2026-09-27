/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isWholeValueTemplateExpression } from './template_expressions';

/**
 * Documents the shape of WHOLE_VALUE_TEMPLATE_EXPRESSION_REGEX via its public helper.
 * Runtime type-preservation for accepted forms is pinned separately in
 * workflows_execution_engine's template_expressions_runtime.test.ts.
 */
describe('isWholeValueTemplateExpression', () => {
  describe('accepted forms (type-preserved at runtime)', () => {
    it.each([
      ['a simple path with surrounding spaces', '${{ event.messages }}'],
      ['a simple path with no inner spaces', '${{event.messages}}'],
      ['a minimal single-character body', '${{x}}'],
      ['inner leading and trailing whitespace around the body', '${{  event.messages  }}'],
      ['tabs as inner whitespace', '${{\tevent.messages\t}}'],
      ['a Liquid filter pipe', '${{ workflow.inputs.recipients | reverse }}'],
      ['Liquid filters with arguments', '${{ x | times: 100 | at_most: 10000 }}'],
      ['a default filter with an array literal', '${{ x | default: [] }}'],
      ['a comparison expression', "${{ error.type == 'NetworkError' }}"],
      ['a quoted string literal as the body', '${{ "hello" }}'],
      ['a single } inside the body (only }} is forbidden)', '${{ { "a": 1 } }}'],
      ['nested property access', '${{ steps.fetch.output.items[0].id }}'],
      ['a multiline expression body', '${{ event.messages\n  | reverse }}'],
      ['a CRLF multiline expression body', '${{ event.messages\r\n  | reverse }}'],
      ['a newline before the non-empty body', '${{\n  event.messages }}'],
      // Liquid validity is not checked — any non-empty body without }} matches.
      ['non-Liquid punctuation as the body', '${{!!!!}}'],
    ])('should return true for %s', (_label, value) => {
      // Given / When / Then
      expect(isWholeValueTemplateExpression(value)).toBe(true);
    });
  });

  describe('rejected forms', () => {
    it.each([
      ['a plain string', 'not-a-template'],
      ['an empty string', ''],
      [
        'a bare {{ expr }} (engine stringifies; $ is required for native-type return)',
        '{{ event.messages }}',
      ],
      ['a space between $ and {{', '$ {{ event.messages }}'],
      ['text before the expression', 'prefix-${{ event.messages }}'],
      ['text after the expression', '${{ event.messages }}-suffix'],
      [
        'two concatenated expressions (evaluateExpression slices first {{ to last }})',
        '${{ a }}-${{ b }}',
      ],
      ['literal text between two expressions', '${{ a }} literal ${{ b }}'],
      ['two expressions separated only by whitespace', '${{ a }} {{ b }}'],
      [
        'leading whitespace on the whole value (runtime check does not trim)',
        '  ${{ event.messages }}',
      ],
      [
        'trailing whitespace on the whole value (runtime check does not trim)',
        '${{ event.messages }}  ',
      ],
      ['a leading tab on the whole value', '\t${{ event.messages }}'],
      ['an empty expression body', '${{}}'],
      ['a whitespace-only expression body', '${{   }}'],
      ['a newline-only expression body', '${{\n}}'],
      ['a tab-only expression body', '${{\t}}'],
      ['}} inside a quoted string (ban is syntactic, not Liquid-aware)', '${{ "}}" }}'],
      ['an unclosed expression', '${{ event.messages'],
      ['a missing closing brace', '${{ event.messages }'],
      ['an extra trailing }', '${{x}}}'],
      ['extra opening braces inside the body', '${{{{ x }}}}'],
    ])('should return false for %s', (_label, value) => {
      // Given / When / Then
      expect(isWholeValueTemplateExpression(value)).toBe(false);
    });
  });
});
