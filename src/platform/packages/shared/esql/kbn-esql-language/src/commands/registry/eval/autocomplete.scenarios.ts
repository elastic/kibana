/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns, functions, operators, timeUnits } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (group: string, name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const EMPTY = 'empty expression';
const OPERATORS = 'after an operand';
const FUNCTIONS = 'in and around functions';
const CURSOR = 'cursor inside the query';
const DATE_MATH = 'date math';
const CASE = 'case';
const SCORE = 'MATCH_PHRASE inside SCORE';

const COMMON_NUMERIC_TYPES = ['double', 'long', 'integer'] as const;
const ROUND_PARAMETER_TYPES = ['double', 'integer', 'long', 'unsigned_long'] as const;
const STRING_TYPES = ['text', 'keyword'] as const;

const NUMBER_PLACEHOLDER = '${0:0}';
const VALUE_PLACEHOLDER = '"${0:value}"';
const DEFAULT_PLACEHOLDER = '"${0:default}"';

const evalFunctions = functions({ availableIn: 'eval', scalar: true });
// At the start of an expression a column is inserted with a space, so the operators open.
const spacedColumns = columns({ followedBySpace: true });
const expression = [...spacedColumns, ...evalFunctions];
// The suggested name for the new column, followed by the assignment.
const newColumn = 'col0 = ';
const newExpression = [newColumn, ...expression];

const subqueryOpeners = ['($0)', '(FROM $0)', '(ROW $0)', '(TS $0)'];
const afterCompleteExpression = ['\n', ', ', '| '];

const operatorsAccepting = (type: 'double' | 'integer' | 'long'): string[] =>
  functions({
    availableIn: 'eval',
    operators: true,
    withoutAssignment: true,
    accepting: [type],
  });

const matchPhraseOptions = [
  '"zero_terms_query": "$0"',
  '"boost": ',
  '"analyzer": "$0"',
  '"slop": ',
];

const caseExpression = [
  ...columns(),
  ...functions({ availableIn: 'eval', scalar: true, except: ['case'] }),
];

export const evalScenarios: ScenarioTable = {
  command: 'eval',
  scenarios: [
    ...rows(
      EMPTY,
      'suggests a new column, columns and functions',
      ['from a | eval '],
      newExpression
    ),
    ...rows(
      EMPTY,
      'suggests the next free name for a new column',
      ['from a | eval col0 = 1, '],
      ['col1 = ', ...expression]
    ),
    ...rows(
      EMPTY,
      'suggests columns and functions after an assignment',
      ['from a | eval col0 = ', 'from a | eval col0 = 1, col1 = ', 'from a | eval a='],
      expression
    ),
    ...rows(
      EMPTY,
      'suggests the columns defined earlier in the same command',
      ['from a | eval a=abs(doubleField), b= '],
      ['a ', ...expression]
    ),
    ...rows(
      EMPTY,
      'suggests the columns a previous STATS produced',
      [
        'from b | stats avg(doubleField) by keywordField | eval ',
        'from d | stats avg(doubleField) by keywordField | eval ',
      ],
      // STATS leaves only its aggregation and grouping columns.
      [newColumn, '`avg(doubleField)` ', 'keywordField ', ...evalFunctions]
    ),
    ...rows(
      EMPTY,
      'suggests the columns a previous EVAL produced',
      ['from c | eval abs(doubleField) + 1 | eval '],
      [newColumn, '`abs(doubleField) + 1` ', ...expression]
    ),
    ...rows(
      EMPTY,
      'after comma',
      ['from a | eval a=round(doubleField), '],
      ['a ', ...newExpression]
    ),
    ...rows(
      OPERATORS,
      'after column',
      ['from a | eval doubleField '],
      operatorsAccepting('double')
    ),
    ...rows(
      OPERATORS,
      'suggests subqueries after IN',
      [
        'from a | eval col = doubleField in ',
        'from a | eval col = doubleField not in ',
        'from index | EVAL doubleField in ',
        'from index | EVAL doubleField not in ',
      ],
      subqueryOpeners
    ),
    ...rows(
      OPERATORS,
      'suggestions after an IN subquery',
      [
        'from index | EVAL col = doubleField in (FROM index | KEEP doubleField) ',
        'from index | EVAL col = doubleField not in (FROM index | KEEP doubleField) ',
      ],
      [...afterCompleteExpression, ...operators('logical')]
    ),
    ...rows(
      OPERATORS,
      'after column after assignment',
      ['from a | eval col = doubleField '],
      [...afterCompleteExpression, ...operatorsAccepting('double')]
    ),
    ...rows(
      OPERATORS,
      'after a column followed by NOT',
      ['from index | EVAL keywordField not '],
      operators('in', 'patternMatch').filter((operator) => !operator.startsWith('NOT '))
    ),
    ...rows(
      OPERATORS,
      'after NOT at the start',
      ['from index | EVAL not '],
      [
        ...columns({ types: 'boolean', followedBySpace: true }),
        ...functions({ availableIn: 'eval', scalar: true, returning: 'boolean' }),
      ]
    ),
    ...rows(
      FUNCTIONS,
      'after a complete function call',
      ['from a | eval a=round(doubleField) ', 'from a | eval a=round((doubleField)) '],
      [
        ...afterCompleteExpression,
        ...functions({
          availableIn: 'eval',
          operators: true,
          withoutAssignment: true,
          accepting: ['double', 'long'],
        }),
        ...operators('in', 'nullCheck'),
      ]
    ),
    ...rows(
      FUNCTIONS,
      'suggests nothing inside an unknown function',
      ['from a | eval a=raund( ', 'from a | eval raund(5, ', 'from a | eval col0 = raund(5, '],
      []
    ),
    ...rows(
      FUNCTIONS,
      'suggests a number placeholder for a constant-only parameter',
      ['from a | eval a=round(doubleField, ', 'from a | eval round(doubleField, '],
      [NUMBER_PLACEHOLDER]
    ),
    ...rows(
      FUNCTIONS,
      'suggests numeric values after an arithmetic operator',
      [
        'from a | eval a=round(doubleField) + ',
        'from a | eval a=round(doubleField)+ ',
        'from a | eval a=doubleField+ ',
      ],
      [
        ...columns({ types: COMMON_NUMERIC_TYPES }),
        ...functions({
          availableIn: 'eval',
          scalar: true,
          returning: [...COMMON_NUMERIC_TYPES, 'dense_vector'],
        }),
      ]
    ),
    ...rows(
      FUNCTIONS,
      'adds a comma to columns and functions while more arguments are required',
      ['from a | eval a=concat( '],
      [
        ...columns({ types: STRING_TYPES }).map((text) => `${text}, `),
        ...functions({
          availableIn: 'eval',
          scalar: true,
          returning: STRING_TYPES,
          except: ['concat'],
        }).map((text) => `${text},`),
      ]
    ),
    ...rows(
      FUNCTIONS,
      'suggests the second argument',
      ['from a | eval a=concat(textField, '],
      [
        ...columns({ types: STRING_TYPES }),
        ...functions({
          availableIn: 'eval',
          scalar: true,
          returning: STRING_TYPES,
          except: ['concat'],
        }),
      ]
    ),
    ...rows(
      FUNCTIONS,
      'adds a comma to columns and functions in the first argument of CIDR_MATCH',
      ['from a | eval a=cidr_match( '],
      [
        ...columns({ types: 'ip' }).map((text) => `${text}, `),
        ...functions({
          availableIn: 'eval',
          scalar: true,
          returning: 'ip',
          except: ['cidr_match'],
        }).map((text) => `${text},`),
      ]
    ),
    ...rows(
      FUNCTIONS,
      'suggests strings in the second argument of CIDR_MATCH',
      ['from a | eval a=cidr_match(ipField, '],
      [
        ...columns({ types: STRING_TYPES }),
        ...functions({
          availableIn: 'eval',
          scalar: true,
          returning: STRING_TYPES,
          except: ['cidr_match'],
        }),
      ]
    ),
    ...[1, 2, 3, 4].map(
      (nesting): Scenario => ({
        group: FUNCTIONS,
        name: `deep function nesting (${nesting})`,
        query: `from a | eval a=${'round('.repeat(nesting)}`,
        after: ' ',
        expect: {
          exact: [
            ...columns({ types: ROUND_PARAMETER_TYPES }),
            ...functions({
              availableIn: 'eval',
              scalar: true,
              returning: ROUND_PARAMETER_TYPES,
              except: ['round'],
            }),
          ],
        },
      })
    ),
    {
      group: CURSOR,
      name: 'suggests for the command the cursor is in',
      query: 'from a | eval col0 = abs(doubleField) ',
      after: '| eval abs(col0)',
      expect: { exact: [...afterCompleteExpression, ...operatorsAccepting('double')] },
    },
    {
      group: CURSOR,
      name: 'discards query after cursor',
      query: 'from a | eval col0 = abs(do',
      after: 'ubleField ) | eval abs(col0) ',
      expect: {
        exact: [
          ...columns({ types: ROUND_PARAMETER_TYPES }),
          ...functions({
            availableIn: 'eval',
            scalar: true,
            returning: ROUND_PARAMETER_TYPES,
            except: ['abs'],
          }),
        ],
      },
    },
    ...rows(
      DATE_MATH,
      'suggests operators after a number',
      ['from a | eval a = 1 '],
      [...afterCompleteExpression, ...operatorsAccepting('integer')]
    ),
    ...rows(
      DATE_MATH,
      'suggests date arithmetic after a time span',
      ['from a | eval a = 1 year '],
      [...afterCompleteExpression, '+ $0', '- $0']
    ),
    ...rows(
      DATE_MATH,
      'suggests time units after a number in a date function',
      ['from a | eval col0=date_trunc(2 '],
      [...timeUnits().map((unit) => `${unit}, `), ',']
    ),
    ...rows(CASE, 'first position', ['from a | eval case('], caseExpression),
    ...rows(
      CASE,
      'suggests string operators after a text column',
      ['from a | eval case( textField '],
      operators('patternMatch', 'in', 'nullCheck')
    ),
    ...rows(
      CASE,
      'suggests numeric operators after a numeric column',
      ['from a | eval case( doubleField '],
      // The unary minus is an arithmetic operator the autocomplete does not suggest.
      operators('comparison', 'arithmetic', 'in', 'nullCheck').filter(
        (operator) => operator !== '-'
      )
    ),
    ...rows(
      CASE,
      'suggests boolean operators and a comma after a boolean column',
      ['from a | eval case( booleanField '],
      ['== $0', '!= $0', ',', ...operators('logical', 'in', 'nullCheck'), 'NOT']
    ),
    ...rows(
      CASE,
      'after comparison operator with a string column',
      ['from a | eval case( keywordField != '],
      [
        ...columns({ types: ['keyword', 'text'] }),
        ...functions({ availableIn: 'eval', scalar: true, returning: ['keyword', 'text'] }),
      ]
    ),
    ...rows(
      CASE,
      'after comparison operator with a numeric column',
      ['from a | eval case( integerField != '],
      [
        ...columns({ types: COMMON_NUMERIC_TYPES }),
        ...functions({ availableIn: 'eval', scalar: true, returning: COMMON_NUMERIC_TYPES }),
      ]
    ),
    ...rows(
      CASE,
      'suggests a value placeholder in the second position',
      ['from a | eval case( integerField != doubleField, '],
      [...caseExpression, VALUE_PLACEHOLDER]
    ),
    ...rows(
      CASE,
      'suggests a default placeholder after complete condition pairs',
      ['from a | eval case(integerField < 0, "negative", integerField > 0, "positive", '],
      [...caseExpression, DEFAULT_PLACEHOLDER]
    ),
    ...rows(
      SCORE,
      'suggests string placeholder for constantOnly query parameter',
      ['from a | eval SCORE(MATCH_PHRASE(textField, '],
      [VALUE_PLACEHOLDER]
    ),
    ...rows(
      SCORE,
      'suggests map params for incomplete options map without pipe/comma',
      ['from a | eval SCORE(MATCH_PHRASE(agent, "value", {'],
      matchPhraseOptions
    ),
    ...rows(
      SCORE,
      'ignores function-like tokens inside strings when detecting map params',
      ['from a | eval SCORE(MATCH_PHRASE(agent, "foo(bar)", {'],
      matchPhraseOptions
    ),
  ],
};
