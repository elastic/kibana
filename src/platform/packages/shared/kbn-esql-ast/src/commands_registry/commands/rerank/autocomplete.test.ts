/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  mockContext,
  lookupIndexFields,
  getMockCallbacks,
} from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, suggest } from '../../../__tests__/autocomplete';
import type { ICommandCallbacks } from '../../types';

// ============================================================================
// Test Constants and Suggestions
// ============================================================================

const SUGGESTION_TOKENS = {
  QUERY_LITERAL: '"${0:Your search query.}"',
  ON_KEYWORD: 'ON ',
  PIPE: '| ',
  COMMA_SPACE: ', ',
  ASSIGNMENT: ' = ',
  WITH_CLAUSE: 'WITH { $0 }',
  AND_OPERATOR: ' AND ',
  OR_OPERATOR: ' OR ',
  INFERENCE_ID_KEY: '"inference_id": "$0"',
  INFERENCE_ENDPOINT: 'inference_1',
} as const;

const OPERATOR_SUGGESTIONS = {
  COMPARISON: ['> $0', '>= $0', '< $0', '<= $0'],
  EQUALITY: ['!= $0', '== $0'],
  LIKE_OPERATORS: ['LIKE $0', 'NOT LIKE $0', 'RLIKE $0', 'NOT RLIKE $0'],
  IN_OPERATORS: ['IN $0', 'NOT IN $0'],
  NULL_OPERATORS: ['IS NULL', 'IS NOT NULL'],
  MATCH_OPERATOR: [': $0'],
};

const SUGGESTION_GROUPS = {
  BASIC_CONTINUATIONS: [
    SUGGESTION_TOKENS.COMMA_SPACE,
    SUGGESTION_TOKENS.WITH_CLAUSE,
    SUGGESTION_TOKENS.PIPE,
  ] as string[],
  FIELD_CONTINUATIONS: [
    SUGGESTION_TOKENS.COMMA_SPACE,
    SUGGESTION_TOKENS.ASSIGNMENT,
    SUGGESTION_TOKENS.WITH_CLAUSE,
    SUGGESTION_TOKENS.PIPE,
  ] as string[],
  BOOLEAN_CONTINUATIONS: [
    SUGGESTION_TOKENS.COMMA_SPACE,
    SUGGESTION_TOKENS.WITH_CLAUSE,
    SUGGESTION_TOKENS.PIPE,
    SUGGESTION_TOKENS.AND_OPERATOR,
    SUGGESTION_TOKENS.OR_OPERATOR,
  ] as string[],
};

// ============================================================================
// Query Builder and Test Helpers
// ============================================================================

interface QueryComponents {
  query?: string;
  targetField?: string;
  targetAssignment?: string;
  onClause?: string;
  withClause?: string;
}

const buildRerankQuery = (components: QueryComponents): string => {
  let query = 'from a | rerank';

  if (components.targetField) {
    query += ` ${components.targetField}`;
  }

  if (components.targetAssignment) {
    query += ` = ${components.targetAssignment}`;
  }

  if (components.query) {
    query += ` ${components.query}`;
  }

  if (components.onClause) {
    query += ` on ${components.onClause}`;
  }

  if (components.withClause) {
    query += ` with ${components.withClause}`;
  }

  return query;
};

type ExpectedSuggestions = string[] | { contains?: string[]; notContains?: string[] };

const expectRerankSuggestions = async (
  query: string,
  expected: ExpectedSuggestions,
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
): Promise<void> => {
  if (Array.isArray(expected)) {
    return expectSuggestions(
      query,
      expected,
      context,
      'rerank',
      mockCallbacks,
      autocomplete,
      offset
    );
  }

  const results = await suggest(query, context, 'rerank', mockCallbacks, autocomplete, offset);
  const texts = results.map((r) => r.text);

  if (expected.contains?.length) {
    expect(texts).toEqual(expect.arrayContaining(expected.contains));
  }

  if (expected.notContains?.length) {
    expect(texts).not.toEqual(expect.arrayContaining(expected.notContains));
  }
};

const createBooleanTestOperators = () => [
  { operator: 'LIKE', value: '"foo"', description: 'LIKE operator with pattern' },
  { operator: 'NOT LIKE', value: '"foo"', description: 'NOT LIKE operator with pattern' },
  { operator: 'RLIKE', value: '"re.*"', description: 'RLIKE operator with regex' },
  { operator: 'NOT RLIKE', value: '"re.*"', description: 'NOT RLIKE operator with regex' },
  { operator: 'IN', value: '("a", "b")', description: 'IN operator with list' },
  { operator: 'NOT IN', value: '("a", "b")', description: 'NOT IN operator with list' },
  { operator: 'IS NULL', value: '', description: 'IS NULL unary operator' },
  { operator: 'IS NOT NULL', value: '', description: 'IS NOT NULL unary operator' },
  { operator: '==', value: '"value"', description: 'equality operator' },
  { operator: '!=', value: '"value"', description: 'inequality operator' },
  { operator: '>', value: '10', description: 'greater than operator (incomplete)' },
  { operator: '>=', value: '10', description: 'greater than or equal operator (incomplete)' },
  { operator: '<', value: '10', description: 'less than operator (incomplete)' },
  { operator: '<=', value: '10', description: 'less than or equal operator (incomplete)' },
  { operator: ':', value: '"needle"', description: 'match operator' },
];

describe('RERANK Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallbacks = getMockCallbacks();
    (mockCallbacks.getColumnsForQuery as jest.Mock).mockResolvedValue([...lookupIndexFields]);
  });

  // ============================================================================
  // Basic Command Structure Tests
  // ============================================================================

  describe('Basic command structure', () => {
    test('suggests query literal and target field after RERANK keyword', async () => {
      const expectedSuggestions = [SUGGESTION_TOKENS.QUERY_LITERAL, 'col0 = '];

      (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

      await expectRerankSuggestions('from a | rerank', expectedSuggestions, mockCallbacks);
    });

    test('suggests ON keyword after complete query', async () => {
      await expectRerankSuggestions(buildRerankQuery({ query: '"search query"' }) + ' ', [
        SUGGESTION_TOKENS.ON_KEYWORD,
      ]);
    });

    test('suggests assignment operator after target field name', async () => {
      await expectRerankSuggestions(buildRerankQuery({ targetField: 'col0' }) + ' ', ['= ']);
    });

    test('suggests query literal after target field assignment', async () => {
      await expectRerankSuggestions(
        buildRerankQuery({ targetField: 'col0', targetAssignment: '' }),
        { contains: [SUGGESTION_TOKENS.QUERY_LITERAL] }
      );
    });

    test('suggests ON after complete target field assignment', async () => {
      await expectRerankSuggestions(
        buildRerankQuery({ targetField: 'col0', targetAssignment: '"query"' }) + ' ',
        [SUGGESTION_TOKENS.ON_KEYWORD]
      );
    });
  });

  // ============================================================================
  // Field Selection and Continuation Tests
  // ============================================================================

  describe('Field selection and continuations', () => {
    test('suggests field continuations after selecting a field', async () => {
      const query = buildRerankQuery({ query: '"search query"', onClause: 'textField' });

      await expectRerankSuggestions(query, [
        'textField, ',
        'textField = ',
        'textField WITH { $0 } ',
        'textField | ',
      ]);
    });

    test('suggests continuations after field with space', async () => {
      const query = buildRerankQuery({ query: '"search query"', onClause: 'textField' }) + ' ';

      await expectRerankSuggestions(query, SUGGESTION_GROUPS.FIELD_CONTINUATIONS);
    });

    test('suggests continuations after multiple fields', async () => {
      const query = buildRerankQuery({
        query: '"search query"',
        onClause: 'textField, keywordField',
      });

      await expectRerankSuggestions(query, [
        'keywordField, ',
        'keywordField = ',
        'keywordField WITH { $0 } ',
        'keywordField | ',
      ]);
    });
  });

  // ============================================================================
  // Boolean Expression Tests
  // ============================================================================

  describe('Boolean expressions', () => {
    test('handles simple equality correctly', async () => {
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: 'textField = keywordField',
        }) + ' ';

      await expectRerankSuggestions(query, {
        contains: OPERATOR_SUGGESTIONS.COMPARISON,
      });
    });

    test('handles comparison with boolean result correctly', async () => {
      const query = buildRerankQuery({
        query: '"search query"',
        onClause: 'integerField >',
      });

      await expectRerankSuggestions(query, {
        contains: ['keywordField', 'textField', 'integerField'],
      });
    });

    test.each([
      {
        name: 'arithmetic expression (non-boolean)',
        expression: 'integerField = integerField + 1',
      },
      { name: 'function call (non-boolean)', expression: 'integerField = round(integerField)' },
    ])('handles $name correctly', async ({ expression }) => {
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: expression,
        }) + ' ';

      await expectRerankSuggestions(query, {
        notContains: [SUGGESTION_TOKENS.AND_OPERATOR, SUGGESTION_TOKENS.OR_OPERATOR],
      });
    });

    test('suggests comparison operators after field and space', async () => {
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: 'textField = keywordField',
        }) + ' ';

      await expectRerankSuggestions(query, {
        contains: OPERATOR_SUGGESTIONS.COMPARISON,
      });
    });

    test('handles complex nested boolean expressions', async () => {
      const complexExpression = 'textField = (keywordField LIKE "a*") AND (integerField < 10)';
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: complexExpression,
        }) + ' ';

      await expectRerankSuggestions(query, SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS);
    });

    test('handles NOT unary operator with LIKE', async () => {
      const expression = 'keywordField = NOT (keywordField LIKE "a*")';
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: expression,
        }) + ' ';

      await expectRerankSuggestions(query, SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS);
    });
  });

  // ============================================================================
  // Terminal Operator Tests
  // ============================================================================

  describe('Terminal operators', () => {
    test.each(createBooleanTestOperators())(
      '$description behavior',
      async ({ operator, value, description }) => {
        const operatorClause = value ? `${operator} ${value}` : operator;
        const query =
          buildRerankQuery({
            query: '"search query"',
            onClause: `textField = keywordField ${operatorClause}`,
          }) + ' ';

        if (description.includes('incomplete')) {
          // Comparison operators that need RHS show other operators
          await expectRerankSuggestions(query, {
            contains: [
              ...OPERATOR_SUGGESTIONS.EQUALITY,
              ...OPERATOR_SUGGESTIONS.COMPARISON.slice(0, 2),
            ],
            notContains: SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS,
          });
        } else {
          // Complete operators show continuations
          await expectRerankSuggestions(query, SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS);
        }
      }
    );

    test('handles empty IN list as incomplete expression', async () => {
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: 'textField = keywordField IN ()',
        }) + ' ';

      await expectRerankSuggestions(query, {
        notContains: SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS,
      });
    });
  });

  // ============================================================================
  // WITH Clause Tests
  // ============================================================================

  describe('WITH clause functionality', () => {
    test('suggests inference_id key in WITH map', async () => {
      const query = buildRerankQuery({
        query: '"search query"',
        onClause: 'textField',
        withClause: '{ ',
      });

      await expectRerankSuggestions(query, [SUGGESTION_TOKENS.INFERENCE_ID_KEY]);
    });

    test('suggests only pipe after complete WITH map', async () => {
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: 'textField',
          withClause: '{ "inference_id": "inference_1" }',
        }) + ' ';

      await expectRerankSuggestions(query, [SUGGESTION_TOKENS.PIPE]);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Advanced boolean expressions', () => {
    test('handles nested NOT expressions', async () => {
      const expression = 'NOT (keywordField LIKE "a*")';
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: `textField = ${expression}`,
        }) + ' ';

      await expectRerankSuggestions(query, SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS);
    });

    test('handles complex parenthesized expressions', async () => {
      // Complex expressions ending with incomplete part show operators
      const expression = '(textField = "value") AND NOT (keywordField';
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: expression,
        }) + ' ';

      await expectRerankSuggestions(query, {
        contains: [
          OPERATOR_SUGGESTIONS.LIKE_OPERATORS[0],
          ...OPERATOR_SUGGESTIONS.COMPARISON.slice(0, 2),
        ],
        notContains: SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS,
      });
    });

    test('handles multiple comparison operators in sequence', async () => {
      // Field at end of expression shows field continuations
      const expression = 'integerField > 10 AND integerField';
      const query = buildRerankQuery({
        query: '"search query"',
        onClause: expression,
      });

      await expectRerankSuggestions(query, {
        contains: ['integerField, ', 'integerField = ', 'integerField WITH { $0 } '],
      });
    });
  });

  describe('Edge cases', () => {
    test('handles dotted field names correctly', async () => {
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: 'host.name = TRUE',
        }) + ' ';

      await expectRerankSuggestions(query, SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS);
    });

    test('handles complete IS NULL expressions correctly', async () => {
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: 'textField = keywordField IS NULL',
        }) + ' ';

      await expectRerankSuggestions(query, {
        contains: SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS,
      });
    });

    test('handles malformed expressions gracefully', async () => {
      const query = buildRerankQuery({
        query: '"search query"',
        onClause: 'textField = keywordField AND',
      });

      await expectRerankSuggestions(query, {
        contains: ['textField', 'keywordField', 'integerField'],
        notContains: SUGGESTION_GROUPS.BOOLEAN_CONTINUATIONS,
      });
    });

    test('handles mixed operator precedence', async () => {
      const expression = 'textField LIKE "a*" AND integerField';
      const query = buildRerankQuery({
        query: '"search query"',
        onClause: expression,
      });

      await expectRerankSuggestions(query, {
        contains: ['integerField, ', 'integerField = ', 'integerField WITH { $0 } '],
      });
    });
  });

  // ============================================================================
  // Parrtial Input
  // ============================================================================

  describe('Partial completions and prefixes', () => {
    test.each([
      {
        name: 'IS NULL operators',
        partial: 'IS N',
        expected: OPERATOR_SUGGESTIONS.NULL_OPERATORS,
      },
      {
        name: 'LIKE operator',
        partial: 'LI',
        expected: [OPERATOR_SUGGESTIONS.LIKE_OPERATORS[0]],
      },
      {
        name: 'IN and IS operators',
        partial: 'I',
        expected: [OPERATOR_SUGGESTIONS.IN_OPERATORS[0], ...OPERATOR_SUGGESTIONS.NULL_OPERATORS],
      },
      {
        name: 'NOT operators',
        partial: 'NO',
        expected: [
          OPERATOR_SUGGESTIONS.IN_OPERATORS[1],
          OPERATOR_SUGGESTIONS.LIKE_OPERATORS[1],
          OPERATOR_SUGGESTIONS.LIKE_OPERATORS[3],
        ],
      },
    ])('completes partial $name', async ({ partial, expected }) => {
      const query = buildRerankQuery({
        query: '"search query"',
        onClause: `textField = keywordField ${partial}`,
      });

      await expectRerankSuggestions(query, {
        contains: expected,
      });
    });
  });

  // ============================================================================
  // Final Command Completion
  // ============================================================================

  describe('Command completion', () => {
    test('suggests only pipe after complete rerank command', async () => {
      const query =
        buildRerankQuery({
          query: '"search query"',
          onClause: 'textField = keywordField',
          withClause: '{ "inference_id": "inference_1" }',
        }) + ' ';

      await expectRerankSuggestions(query, [SUGGESTION_TOKENS.PIPE]);
    });
  });
});
