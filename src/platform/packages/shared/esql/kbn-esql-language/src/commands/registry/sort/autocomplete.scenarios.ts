/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  inOperators,
  nullCheckOperators,
  patternMatchOperators,
} from '../../definitions/all_operators';
import { columns, functions, operators } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (group: string, name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const EXPRESSION = 'SORT <expression> ...';
const ORDER = '... [ ASC / DESC ] ...';
const NULLS = '... [ NULLS FIRST / NULLS LAST ]';

const sortFunctions = functions({ availableIn: 'sort', scalar: true });
const expression = [...columns(), ...sortFunctions];
const expressionAfterKeywordField = [
  ...columns().filter((text) => text !== 'keywordField'),
  ...sortFunctions,
];

// Text and keyword fields take the string operators, not the comparison ones.
const stringOperators = operators(patternMatchOperators, inOperators, nullCheckOperators);

const afterColumn = [
  '\n',
  ', ',
  '| ',
  'ASC',
  'DESC',
  'NULLS FIRST',
  'NULLS LAST',
  ...stringOperators,
];

const afterOrder = ['\n', 'NULLS FIRST', 'NULLS LAST', ', ', '| '];

const completeWord = (word: string, followers: string[]): string[] => [
  '\n',
  ...followers.map((follower) => `${word}${follower}`),
];

const columnFollowers = [', ', ' | ', ' ASC', ' DESC', ' NULLS FIRST', ' NULLS LAST'];
const orderFollowers = [' NULLS FIRST', ' NULLS LAST', ', ', ' | '];

export const sortScenarios: ScenarioTable = {
  command: 'sort',
  scenarios: [
    ...rows(EXPRESSION, 'suggests column', ['from a | sort ', 'from a | sort keyw'], expression),
    ...rows(
      EXPRESSION,
      'suggests column after a comma',
      ['from a | sort keywordField, ', 'from a | sort keywordField, doubl'],
      expressionAfterKeywordField
    ),
    ...rows(
      EXPRESSION,
      'suggests modifiers after complete column name',
      ['from a | sort keywordField'],
      completeWord('keywordField', columnFollowers)
    ),
    ...rows(
      EXPRESSION,
      'suggests modifiers after the second complete column name',
      ['from a | sort keywordField, doubleField'],
      completeWord('doubleField', columnFollowers)
    ),
    ...rows(
      EXPRESSION,
      'suggests modifiers and expression operators after column + whitespace',
      [
        'from a | sort keywordField ',
        'from a | sort doubleField ASC, keywordField ',
        'from a | sort (keywordField) ',
      ],
      afterColumn
    ),
    {
      group: EXPRESSION,
      name: 'suggests within functions',
      query: 'FROM a | SORT TRIM(',
      expect: { contains: ['keywordField'] },
    },
    ...rows(
      ORDER,
      'when user starts to type an order modifier',
      ['from a | sort keywordField A', 'from a | sort keywordField D'],
      afterColumn
    ),
    ...rows(
      ORDER,
      'when the order modifier is complete',
      ['from a | sort keywordField ASC'],
      completeWord('ASC', orderFollowers)
    ),
    ...rows(
      ORDER,
      'when the lowercase ASC modifier is complete',
      ['from a | sort keywordField asc'],
      completeWord('asc', orderFollowers)
    ),
    ...rows(
      ORDER,
      'when the lowercase DESC modifier is complete',
      ['from a | sort keywordField desc'],
      completeWord('desc', orderFollowers)
    ),
    ...rows(
      ORDER,
      'suggests nulls modifier after order modifier + space',
      ['from a | sort keywordField ASC ', 'from a | sort keywordField DESC '],
      afterOrder
    ),
    ...rows(
      NULLS,
      'when user starts to type NULLS modifiers',
      [
        'from a | sort keywordField N',
        'from a | sort keywordField null',
        'from a | sort keywordField nulls',
        'from a | sort keywordField nulls ',
        'from a | sort keywordField NULLS F',
        'from a | sort keywordField NULLS FI',
        'from a | sort keywordField NULLS L',
        'from a | sort keywordField NULLS LAS',
      ],
      afterColumn
    ),
    ...rows(
      NULLS,
      'after nulls are entered, suggests comma or pipe',
      ['from a | sort keywordField NULLS LAST '],
      ['\n', ', ', '| ']
    ),
  ],
};
