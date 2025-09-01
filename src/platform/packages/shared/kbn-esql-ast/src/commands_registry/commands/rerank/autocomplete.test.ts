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

// Common token patterns used across rerank autocomplete
const NEXT_ACTION_TOKENS = [', ', ' = ', 'WITH { $0 }', '| '];
const NEXT_TOKENS_NO_ASSIGN = [', ', 'WITH { $0 }', '| '];
const LOGICAL_UNION_OPERATORS = [' AND ', ' OR '];
const BOOLEAN_NEXT_TOKENS = [...NEXT_TOKENS_NO_ASSIGN, ...LOGICAL_UNION_OPERATORS];

// Test query fragments
const TEST_QUERIES = {
  RERANK_PREFIX: 'from a | rerank ',
  BASE: 'from a | rerank "query"',
  BASE1: 'from a | rerank col0 ',
  BASE2: 'from a | rerank col0 = ',
  WITH_FIELD: 'from a | rerank "query" on textField',
  WITH_ASSIGNMENT: 'from a | rerank "query" on textField = ',
  WITH_TWO_FIELDS: 'from a | rerank "query" on textField, keywordField',
  COMPLEX_BOOLEAN:
    'from a | rerank "query" on textField = keywordField > integerField AND dateField < doubleField',
} as const;

const BASIC_SUGGESTIONS = {
  STRING_LITERAL: '"${0:Your search query.}"',
  ON_KEYWORD: 'ON ',
  PIPE: '| ',
  INFERENCE_ID_KEY: '"inference_id": "$0"',
  INFERENCE_ENDPOINT: 'inference_1',
} as const;

const expectRerankSuggestions = async (
  query: string,
  expected:
    | string[]
    | {
        contains?: string[];
        notContains?: string[];
      },
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

describe('RERANK Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallbacks = getMockCallbacks();
    (mockCallbacks.getColumnsForQuery as jest.Mock).mockResolvedValue([...lookupIndexFields]);
  });

  test('suggestions for basic rerank command', async () => {
    const expectedSuggestions = [BASIC_SUGGESTIONS.STRING_LITERAL, 'col0 = '];

    (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

    await expectRerankSuggestions('from a | rerank', expectedSuggestions, mockCallbacks);
  });

  test('should suggest ON and pipe after query', async () => {
    await expectRerankSuggestions(`${TEST_QUERIES.BASE} `, [BASIC_SUGGESTIONS.ON_KEYWORD]);
  });

  test('should suggest comma, expression, WITH and pipe after selecting a field', async () => {
    await expectRerankSuggestions(TEST_QUERIES.WITH_FIELD, [
      'textField, ',
      'textField = ',
      'textField WITH { $0 } ',
      'textField | ',
    ]);
  });

  test.each([`${TEST_QUERIES.WITH_FIELD} `, `${TEST_QUERIES.BASE} ON textField `])(
    'after field with space, should suggest continuations (not fields): %s',
    async (query) => {
      await expectRerankSuggestions(query, NEXT_ACTION_TOKENS);
    }
  );

  test('assignment with RHS token should not show query literal suggestion', async () => {
    const query = `${TEST_QUERIES.WITH_ASSIGNMENT}keywordField`;
    await expectRerankSuggestions(query, {
      notContains: ['"${0:Your search query.}"'],
    });
  });

  test('after selecting a second field, suggest comma, expression, WITH and pipe again', async () => {
    await expectRerankSuggestions(`${TEST_QUERIES.WITH_TWO_FIELDS}`, [
      'keywordField, ',
      'keywordField = ',
      'keywordField WITH { $0 } ',
      'keywordField | ',
    ]);
  });

  // ============================================================================
  // WITH Clause Tests
  // ============================================================================

  describe('WITH clause functionality', () => {
    test('WITH map suggests inference_id key', async () => {
      await expectRerankSuggestions(`${TEST_QUERIES.WITH_FIELD} WITH { `, [
        BASIC_SUGGESTIONS.INFERENCE_ID_KEY,
      ]);
    });

    test('WITH value caret between quotes: no {} suggestion, endpoints shown if available', async () => {
      const queryPrefix = `${TEST_QUERIES.WITH_FIELD} WITH { "inference_id": "`;
      const query = `${queryPrefix}" }`;
      const offset = queryPrefix.length;

      await expectRerankSuggestions(
        query,
        [BASIC_SUGGESTIONS.INFERENCE_ENDPOINT],
        mockCallbacks,
        mockContext,
        offset
      );
    });

    test('after complete WITH map, suggests only the pipe', async () => {
      await expectRerankSuggestions(
        `${TEST_QUERIES.WITH_FIELD} WITH { "inference_id": "inference_1" } `,
        [BASIC_SUGGESTIONS.PIPE]
      );
    });

    test('after boolean expression with WITH keyword, should suggest map parameters', async () => {
      await expectRerankSuggestions(
        `${TEST_QUERIES.BASE} on textField = keywordField > integerField WITH { `,
        [BASIC_SUGGESTIONS.INFERENCE_ID_KEY]
      );
    });

    test('complete boolean expression with multiple fields before WITH', async () => {
      await expectRerankSuggestions(
        `${TEST_QUERIES.BASE} on textField = keywordField AND dateField > integerField, doubleField WITH { `,
        [BASIC_SUGGESTIONS.INFERENCE_ID_KEY]
      );
    });

    test('inside WITH clause should not suggest any next actions or operators', async () => {
      const queryPrefix = `${TEST_QUERIES.BASE} on textField = keywordField WITH { "inference_id": `;
      const query = `${queryPrefix}" }`;
      const offset = queryPrefix.length;

      await expectRerankSuggestions(
        query,
        [BASIC_SUGGESTIONS.PIPE],
        mockCallbacks,
        mockContext,
        offset
      );
    });
  });

  // ============================================================================
  // Boolean Expression Tests
  // ============================================================================

  describe('Boolean expressions in field assignments', () => {
    test('complex boolean expression with multiple AND/OR - complete expression suggests continuations', async () => {
      await expectRerankSuggestions(`${TEST_QUERIES.COMPLEX_BOOLEAN} `, BOOLEAN_NEXT_TOKENS);
    });

    test('after logical operator and field token, suggest operators', async () => {
      const query = `${TEST_QUERIES.BASE} on textField = keywordField AND keywordField`;
      await expectRerankSuggestions(query, { contains: ['> $0', '>= $0', '< $0', '<= $0'] });
    });

    test('after RHS operand and space, suggest comparison operators', async () => {
      const query = `${TEST_QUERIES.BASE} on textField = keywordField `;
      await expectRerankSuggestions(query, { contains: ['> $0', '>= $0', '< $0', '<= $0'] });
    });

    test('boolean literal (TRUE) completes RHS and suggests continuations', async () => {
      await expectRerankSuggestions(
        `${TEST_QUERIES.BASE} on textField = TRUE `,
        BOOLEAN_NEXT_TOKENS
      );
    });

    test('boolean column completes RHS and suggests continuations', async () => {
      await expectRerankSuggestions(
        `${TEST_QUERIES.BASE} on textField = booleanField `,
        BOOLEAN_NEXT_TOKENS
      );
    });

    test('boolean literal with dotted field completes RHS and suggests continuations', async () => {
      await expectRerankSuggestions(
        `${TEST_QUERIES.BASE} on host.name = TRUE `,
        BOOLEAN_NEXT_TOKENS
      );
    });

    test('arithmetic RHS (non-boolean) should not unlock AND/OR continuations', async () => {
      const query = `${TEST_QUERIES.BASE} on integerField = integerField + 1 `;
      await expectRerankSuggestions(query, { notContains: [' AND ', ' OR '] });
    });

    test('non-boolean function RHS should not unlock AND/OR continuations', async () => {
      const query = `${TEST_QUERIES.BASE} on integerField = round(integerField) `;
      await expectRerankSuggestions(query, { notContains: [' AND ', ' OR '] });
    });

    test('parenthesized boolean expression suggests continuations', async () => {
      await expectRerankSuggestions(
        `${TEST_QUERIES.BASE} on textField = (keywordField LIKE "a*") AND (integerField < 10) `,
        BOOLEAN_NEXT_TOKENS
      );
    });

    test('NOT unary over LIKE completes and suggests continuations', async () => {
      await expectRerankSuggestions(
        `${TEST_QUERIES.BASE} on keywordField = NOT (keywordField LIKE "a*") `,
        BOOLEAN_NEXT_TOKENS
      );
    });
  });

  describe('Field assignment after comma', () => {
    test('after comma and field equals, suggest fields/functions (ON_AFTER_FIELD_ASSIGNMENT)', async () => {
      await expectRerankSuggestions(`${TEST_QUERIES.BASE1}`, ['= '], mockCallbacks);
    });

    test('after special-char field equals, suggest fields/functions (ON_AFTER_FIELD_ASSIGNMENT)', async () => {
      await expectRerankSuggestions(`${TEST_QUERIES.BASE} on any#Char$Field = `, {
        contains: ['textField ', 'keywordField ', 'doubleField '],
      });
    });
  });

  describe('Target field assignment (AST-based)', () => {
    test('after potential target field with space, suggest assignment operator', async () => {
      await expectRerankSuggestions(
        TEST_QUERIES.BASE2,
        [BASIC_SUGGESTIONS.STRING_LITERAL],
        mockCallbacks
      );
    });

    test('after target field assignment, suggest basic constants', async () => {
      await expectRerankSuggestions(
        TEST_QUERIES.BASE2,
        [BASIC_SUGGESTIONS.STRING_LITERAL],
        mockCallbacks
      );
    });

    test('after target field assignment with complete query, suggest ON', async () => {
      await expectRerankSuggestions(`${TEST_QUERIES.BASE2} "query"`, [
        BASIC_SUGGESTIONS.ON_KEYWORD,
      ]);
    });
  });

  // ============================================================================
  // Boolean Termination Tests
  // ============================================================================

  describe('Boolean terminal completeness (LIKE/RLIKE/IN/IS NULL/match)', () => {
    const testBooleanTerminalOperators = [
      { operator: 'LIKE', value: '"foo"' },
      { operator: 'RLIKE', value: '"re.*"' },
      { operator: 'IN', value: '("a", "b")' },
      { operator: 'IS NULL', value: '' },
      { operator: 'IS NOT NULL', value: '' },
      { operator: ':', value: '"needle"' },
    ];

    testBooleanTerminalOperators.forEach(({ operator, value }) => {
      const testName =
        operator === ':'
          ? 'match operator (:) completes boolean expression'
          : `${operator} completes boolean expression`;

      test(testName, async () => {
        const operatorClause = value ? `${operator} ${value}` : operator;
        const query = `${TEST_QUERIES.BASE} on textField = keywordField ${operatorClause} `;

        await expectRerankSuggestions(query, BOOLEAN_NEXT_TOKENS);
      });
    });
  });
});
