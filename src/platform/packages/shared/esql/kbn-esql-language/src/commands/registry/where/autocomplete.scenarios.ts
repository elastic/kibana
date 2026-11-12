/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KQL_TYPE_TO_KIND_MAP } from '@kbn/esql-types';
import {
  columns,
  dateDiffUnits,
  dateLiterals,
  functions,
  operators,
} from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (group: string, name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const START = 'beginning an expression';
const WITHIN = 'within the expression';
const MATCH = 'match operator right operand';
const KQL = 'KQL function autocomplete';

const NUMERIC_TYPES = ['double', 'integer', 'long', 'unsigned_long'] as const;
const COMMON_NUMERIC_TYPES = ['double', 'long', 'integer'] as const;
const STRING_COMPARABLE_TYPES = ['text', 'keyword', 'ip', 'version'] as const;
const DATE_TYPES = ['date', 'date_nanos'] as const;
const FULL_TEXT_FUNCTIONS = ['match', 'match_phrase', 'qstr', 'kql', ':'];

const whereFunctions = functions({ availableIn: 'where', scalar: true });
const anyExpression = [...columns(), ...whereFunctions];
// At the start of the expression a column is inserted with a space, so the operators open.
const emptyExpression = [...columns({ followedBySpace: true }), ...whereFunctions];

const expressionOf = (
  types: readonly (typeof COMMON_NUMERIC_TYPES | typeof DATE_TYPES)[number][]
) => [
  ...columns({ types }),
  ...functions({ availableIn: 'where', scalar: true, returning: types }),
];

const comparisons = ['!= $0', '< $0', '<= $0', '== $0', '> $0', '>= $0'];
const afterStringColumn = [
  ...comparisons,
  ...operators('match', 'patternMatch', 'in', 'nullCheck'),
];
const afterCompleteExpression = ['\n', '| ', ...operators('logical')];
const subqueryOpeners = ['($0)', '(FROM $0)', '(ROW $0)', '(TS $0)'];
const negatableOperators = operators('patternMatch', 'in').filter(
  (operator) => !operator.startsWith('NOT ')
);
const doubleFunctions = functions({ availableIn: 'where', scalar: true, returning: 'double' });
const doubleColumns = columns({ types: 'double', followedBySpace: true });

const kqlItems = ['field_name', 'other_field'].map((name) => ({
  text: name,
  label: name,
  kind: KQL_TYPE_TO_KIND_MAP.field,
}));

// Mimics the KQL provider: each suggestion replaces the current word, from the last space to the cursor.
const getKqlSuggestions = async (kqlQuery: string) =>
  kqlItems.map((item) => ({
    ...item,
    range: { start: kqlQuery.lastIndexOf(' ') + 1, end: kqlQuery.length },
  }));

const kqlRows = (name: string, query: string, exact: Scenario['expect']['exact']): Scenario => ({
  group: KQL,
  name,
  query,
  world: { getKqlSuggestions },
  expect: { exact },
});

const KQL_PREFIX = 'from index | WHERE KQL("""';
const KQL_PARTIAL_WORD = `${KQL_PREFIX}field_na`;
const KQL_SECOND_WORD = `${KQL_PREFIX}fieldA AND field_na`;

export const whereScenarios: ScenarioTable = {
  command: 'where',
  scenarios: [
    ...rows(
      START,
      'suggests columns and functions',
      ['from a | where ', 'from a | eval col0 = 1 | where '],
      emptyExpression
    ),
    ...rows(
      WITHIN,
      'after a field name',
      ['from a | where keywordField ', 'from a | where keywordField I'],
      afterStringColumn
    ),
    ...rows(
      WITHIN,
      'after a field name inside parens',
      ['from a | where (keywordField '],
      afterStringColumn
    ),
    ...rows(
      WITHIN,
      'at the start of a parenthesized expression',
      ['from a | where ('],
      emptyExpression
    ),
    ...rows(
      MATCH,
      'suggests the value placeholder after a text field',
      ['from a | where textField : '],
      ['"${0:value}"']
    ),
    ...rows(
      MATCH,
      'suggests the value placeholder after a function left operand',
      ['from a | where concat(textField, keywordField) : '],
      ['"${0:value}"']
    ),
    ...rows(
      MATCH,
      'suggests only the number placeholder after a numeric field',
      ['from a | where doubleField : '],
      ['${0:0}']
    ),
    ...rows(
      MATCH,
      'suggests date literals after a date field',
      ['from a | where dateField : '],
      [...dateLiterals(), '"${0:value}"']
    ),
    ...rows(
      MATCH,
      'suggests boolean constants after a boolean field',
      ['from a | where booleanField : '],
      ['true', 'false', '"${0:value}"']
    ),
    {
      group: MATCH,
      // The command-level test expects a "create control" item here, from a hand-built context.
      // `suggest()` never gives WHERE that context, so the editor does not show the item.
      name: 'does not suggest creating a control when controls are supported',
      query: 'from a | where textField : ',
      world: { supportsControls: true },
      expect: { exact: ['"${0:value}"'] },
    },
    ...rows(
      MATCH,
      'suggests logical continuations after a complete match expression',
      ['from a | where textField : "value" '],
      afterCompleteExpression
    ),
    ...rows(
      WITHIN,
      'suggests dates after a comparison with a date',
      [
        'from a | where dateField == ',
        'from a | where dateField < ',
        'from a | where dateField >= ',
      ],
      [...dateLiterals(), ...expressionOf(DATE_TYPES)]
    ),
    ...rows(
      WITHIN,
      'after a comparison with a string field',
      ['from a | where textField >= ', 'from a | where textField >= textFiel'],
      [
        ...columns({ types: STRING_COMPARABLE_TYPES }),
        ...functions({ availableIn: 'where', scalar: true, returning: STRING_COMPARABLE_TYPES }),
      ]
    ),
    ...rows(
      WITHIN,
      'after a logical operator',
      [
        'from a | where keywordField >= keywordField and ',
        'from a | where keywordField >= keywordField or ',
      ],
      anyExpression
    ),
    ...rows(
      WITHIN,
      'after a column following a logical operator',
      [
        'from a | where keywordField >= keywordField and doubleField ',
        'from a | where keywordField >= keywordField or doubleField ',
      ],
      functions({
        availableIn: 'where',
        returning: 'boolean',
        operators: true,
        accepting: ['double'],
      })
    ),
    ...rows(
      WITHIN,
      'after chained logical operators',
      ['from a | where doubleField < 1 AND doubleField > 2 OR doubleField == 3 AND '],
      anyExpression
    ),
    ...rows(
      WITHIN,
      'after chained logical operator inside function',
      ['from a | where CASE(doubleField < 1 AND doubleField > 2 OR doubleField == 3 AND '],
      [
        ...columns(),
        ...functions({ availableIn: 'where', scalar: true, except: FULL_TEXT_FUNCTIONS }),
      ]
    ),
    ...rows(
      WITHIN,
      'after a logical operator numeric',
      [
        'from a | where keywordField >= keywordField and doubleField == ',
        'from a | where keywordField >= keywordField or doubleField == ',
      ],
      expressionOf(COMMON_NUMERIC_TYPES)
    ),
    ...rows(
      WITHIN,
      // The command-level test expects operators here, from a context that still has the column.
      'suggests nothing after a column that STATS dropped',
      ['from a | stats a=avg(doubleField) | where doubleField '],
      []
    ),
    ...rows(
      WITHIN,
      'suggests operators after a column that STATS created',
      ['from a | stats a=avg(doubleField) | where a '],
      [
        ...operators('match'),
        ...functions({
          availableIn: 'where',
          operators: true,
          withoutAssignment: true,
          accepting: ['double'],
        }),
      ]
    ),
    ...rows(
      WITHIN,
      'suggests function arguments',
      ['from a | where log10('],
      [
        ...columns({ types: NUMERIC_TYPES }),
        ...functions({
          availableIn: 'where',
          scalar: true,
          returning: NUMERIC_TYPES,
          except: ['log10'],
        }),
      ]
    ),
    ...rows(
      WITHIN,
      'suggests the second function argument',
      ['from a | WHERE pow(doubleField, '],
      [
        ...columns({ types: NUMERIC_TYPES }),
        ...functions({
          availableIn: 'where',
          scalar: true,
          returning: NUMERIC_TYPES,
          except: ['pow'],
        }),
      ]
    ),
    ...rows(
      WITHIN,
      'suggests boolean and numeric operators after a numeric function result',
      ['from a | where log10(doubleField) ', 'from a | where ROUND((doubleField)) '],
      [
        ...operators('match'),
        ...functions({
          availableIn: 'where',
          returning: 'double',
          operators: true,
          withoutAssignment: true,
          accepting: ['double'],
        }),
        ...functions({
          availableIn: 'where',
          returning: 'boolean',
          operators: true,
          withoutAssignment: true,
          accepting: ['double'],
        }),
      ]
    ),
    ...rows(
      WITHIN,
      'suggestions after IS',
      ['from index | WHERE keywordField IS '],
      operators('nullCheck')
    ),
    ...rows(
      WITHIN,
      'suggestions after a partial IS NULL',
      ['from index | WHERE keywordField IS NU'],
      ['IS NULL']
    ),
    ...rows(
      WITHIN,
      'suggestions after NOT',
      ['from index | WHERE keywordField not ', 'from index | WHERE keywordField NOT '],
      negatableOperators
    ),
    ...rows(
      WITHIN,
      'suggestions after a negated function',
      ['FROM index | WHERE NOT ENDS_WITH(keywordField, "foo") '],
      afterCompleteExpression
    ),
    ...rows(
      WITHIN,
      'suggestions after IS NOT',
      ['from index | WHERE keywordField IS NOT ', 'from index | WHERE keywordField IS NOT      '],
      ['IS NOT NULL']
    ),
    ...rows(
      WITHIN,
      'suggests subqueries after IN',
      ['from index | WHERE doubleField in ', 'from index | WHERE doubleField not in '],
      subqueryOpeners
    ),
    ...rows(
      WITHIN,
      'suggestions after an IN subquery',
      [
        'from index | WHERE doubleField in (FROM index | KEEP doubleField) ',
        'from index | WHERE doubleField not in (FROM index | KEEP doubleField) ',
        'from index | WHERE doubleField in (ROW doubleField = 1) ',
      ],
      afterCompleteExpression
    ),
    ...rows(
      WITHIN,
      'suggests values of the left operand type inside an IN list',
      ['from index | WHERE doubleField not in ('],
      [...doubleColumns, ...doubleFunctions]
    ),
    ...rows(
      WITHIN,
      'leaves the left operand out of the next values of an IN list',
      [
        'from index | WHERE doubleField in ( textField, ',
        'from index | WHERE (doubleField) in ( textField, ',
      ],
      [...doubleColumns.filter((text) => text !== 'doubleField '), ...doubleFunctions]
    ),
    ...rows(
      WITHIN,
      'suggests null checks after a parenthesized IN subquery',
      [
        'from index | WHERE (doubleField in (FROM index | KEEP doubleField))',
        'from index | WHERE (doubleField not in (FROM index | KEEP doubleField)) ',
      ],
      ['\n', '| ', ...operators('logical', 'nullCheck')]
    ),
    ...rows(
      WITHIN,
      'suggestions after IS (NOT) NULL',
      ['FROM index | WHERE tags.keyword IS NULL ', 'FROM index | WHERE tags.keyword IS NOT NULL '],
      operators('logical')
    ),
    ...rows(
      WITHIN,
      'suggestions after an arithmetic expression',
      ['FROM index | WHERE doubleField + doubleField '],
      functions({
        availableIn: 'where',
        operators: true,
        withoutAssignment: true,
        accepting: ['double'],
        except: [':'],
      })
    ),
    {
      group: WITHIN,
      name: 'pipe suggestion after complete expression',
      query: 'from index | WHERE doubleField != doubleField ',
      expect: { contains: [{ text: '| ', label: '|' }] },
    },
    ...rows(
      'function parameter constraints',
      'constantOnly constraint - DATE_DIFF should suggest only constants',
      ['from a | where DATE_DIFF('],
      dateDiffUnits()
    ),
    kqlRows('returns KQL suggestions when cursor is inside KQL("""...)', KQL_PARTIAL_WORD, [
      'field_name',
      'other_field',
    ]),
    kqlRows('returns KQL suggestions for an empty KQL query', KQL_PREFIX, [
      'field_name',
      'other_field',
    ]),
    kqlRows('rangeToReplace starts at the typed word, not at the """ delimiter', KQL_PARTIAL_WORD, [
      {
        text: 'field_name',
        rangeToReplace: { start: KQL_PREFIX.length, end: KQL_PARTIAL_WORD.length },
      },
      'other_field',
    ]),
    kqlRows(
      'rangeToReplace covers only the current word in multi-token KQL queries',
      KQL_SECOND_WORD,
      [
        {
          text: 'field_name',
          rangeToReplace: {
            start: KQL_SECOND_WORD.lastIndexOf('field_na'),
            end: KQL_SECOND_WORD.length,
          },
        },
        'other_field',
      ]
    ),
  ],
};
