/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns, functions, operators } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable, ScenarioWorld } from '../../../__tests__/scenarios';

const rows = (
  group: string,
  name: string,
  queries: string[],
  exact: string[],
  world?: Partial<ScenarioWorld>
): Scenario[] => queries.map((query) => ({ group, name, query, world, expect: { exact } }));

const BASIC = 'Basic command structure';
const BOOLEAN = 'Boolean expressions';
const TERMINAL = 'Terminal operators';
const WITH_CLAUSE = 'WITH clause functionality';
const EDGE = 'Edge cases';
const PARTIAL = 'Partial completions and prefixes';

const QUERY_LITERAL = '"${0:Your search query}"';
const ON = 'from a | rerank "search query" on ';
const NEXT_ACTIONS = ['\n', 'WITH { $0 }', ', ', '| '];
const NEXT_ACTIONS_EXPRESSIONS = [...NEXT_ACTIONS, ...operators('logical')];

const rerankEndpoints: Partial<ScenarioWorld> = {
  inferenceEndpoints: [
    { inference_id: 'rerank_1', task_type: 'rerank' },
    { inference_id: 'inference_1', task_type: 'completion' },
  ],
};

const stringColumns = columns({ types: ['keyword', 'text'], followedBySpace: true });
const stringFunctions = functions({
  availableIn: 'rerank',
  returning: ['text', 'keyword'],
  scalar: true,
});

const COMPLETE_CONDITIONS = [
  ...['==', '!=', '<', '>', '<=', '>='].map((operator) => `${operator} "test_value"`),
  ...['LIKE', 'NOT LIKE', 'RLIKE', 'NOT RLIKE', ':'].map((operator) => `${operator} "pattern*"`),
  ...['IN', 'NOT IN'].map((operator) => `${operator} ("option1", "option2", "option3")`),
  'IS NULL',
  'IS NOT NULL',
];

export const rerankScenarios: ScenarioTable = {
  command: 'rerank',
  scenarios: [
    ...rows(
      BASIC,
      'suggests query literal and target field after RERANK keyword',
      ['from a | rerank '],
      [QUERY_LITERAL, 'col0 = ']
    ),
    ...rows(
      BASIC,
      'suggests ON keyword after complete query',
      ['from a | rerank "search query" '],
      ['ON ']
    ),
    ...rows(
      BASIC,
      'suggests assignment operator after target field name',
      ['from a | rerank col0 '],
      ['= ']
    ),
    ...rows(
      BASIC,
      'suggests query literal after target field assignment',
      ['from a | rerank col0 = '],
      [QUERY_LITERAL]
    ),
    ...rows(
      BASIC,
      'suggests ON after complete target field assignment',
      ['from a | rerank col0 = "query" '],
      ['ON ']
    ),
    ...rows(
      BASIC,
      'suggests a new column, text and keyword fields and functions after ON',
      ['from a | rerank "search query" ON '],
      ['col0 = ', ...stringColumns, ...stringFunctions]
    ),
    ...rows(
      BASIC,
      'suggests text and keyword fields after an incomplete assignment in ON clause',
      [`${ON}col0 = `],
      [...stringColumns, ...stringFunctions]
    ),
    ...rows(
      BASIC,
      'suggests field columns after a list of fields and comma',
      [`${ON}textField, col0 = TRUE, keywordField, integerField, `],
      ['col1 = ', ...stringColumns, ...stringFunctions]
    ),
    ...rows(
      BASIC,
      'suggests field continuations after selecting a field',
      [`${ON}keywordField`],
      [...NEXT_ACTIONS, 'col0 = ', ...stringColumns, ...stringFunctions]
    ),
    ...rows(
      BASIC,
      'suggests continuations after field with more trailing spaces',
      [`${ON}keywordField `],
      NEXT_ACTIONS
    ),

    ...[
      { name: 'arithmetic expression', expression: 'integerField = integerField + 1' },
      { name: 'function call', expression: 'integerField = round(integerField)' },
    ].map(
      ({ name, expression }): Scenario => ({
        group: BOOLEAN,
        name: `suggests comparison but not logical operators after a non-boolean ${name}`,
        query: `${ON}${expression} `,
        expect: {
          contains: [...NEXT_ACTIONS, ...operators('comparison')],
          excludes: operators('logical'),
        },
      })
    ),
    ...rows(
      BOOLEAN,
      'suggests the assignment after a new name that follows a list with boolean expressions',
      [`${ON}textField = NOT (keywordField LIKE "a*"), customField  `],
      ['= ']
    ),
    ...rows(
      BOOLEAN,
      'handles complex nested boolean expressions',
      [`${ON}textField = NOT (keywordField LIKE "a*") AND (integerField < 10) `],
      NEXT_ACTIONS_EXPRESSIONS
    ),
    ...rows(
      BOOLEAN,
      'suggests next actions after simple field assignment',
      [`${ON}col0 = keywordField `],
      NEXT_ACTIONS
    ),

    ...rows(
      TERMINAL,
      'shows continuations after a complete condition',
      COMPLETE_CONDITIONS.map((condition) => `${ON}textField = keywordField ${condition} `),
      NEXT_ACTIONS_EXPRESSIONS
    ),
    ...rows(
      TERMINAL,
      'handles empty IN list as incomplete expression',
      [`${ON}textField = keywordField IN () `],
      [...stringColumns, ...stringFunctions]
    ),

    ...rows(
      WITH_CLAUSE,
      'suggests opening braces with inference_id when WITH is already typed',
      [`${ON}textField WITH `],
      ['{ "inference_id": "$0" }']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests inference_id key in WITH map',
      [`${ON}textField with { `],
      ['"inference_id": "$0"']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests only pipe after complete WITH map',
      [`${ON}textField with { "inference_id": "inference_1" } `],
      ['\n', '| ']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests rerank inference endpoints as the values for inference_id',
      [
        `${ON}textField with { "inference_id": "`,
        `${ON}textField with { "inference_id": "i`,
        `${ON}textField with { "inference_id": "inf`,
      ],
      ['"rerank_1"'],
      rerankEndpoints
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests no endpoint of another task type',
      [`${ON}textField with { "inference_id": "`],
      []
    ),
    ...rows(
      WITH_CLAUSE,
      'does not suggest anything if all the parameters are already provided',
      [`${ON}textField with { "inference_id": "inference_1", `],
      [],
      rerankEndpoints
    ),
    ...rows(
      WITH_CLAUSE,
      'does not suggest anything if the parameter name is unsupported',
      [`${ON}textField with { "unsupported_param": "`],
      [],
      rerankEndpoints
    ),

    ...rows(
      EDGE,
      'handles dotted field names correctly',
      [`${ON}host.name = TRUE `],
      NEXT_ACTIONS_EXPRESSIONS
    ),
    ...rows(
      EDGE,
      'suggests nothing after a trailing logical operator',
      [`${ON}textField = keywordField AND`, `${ON}textField = keywordField AND `],
      []
    ),

    ...rows(
      PARTIAL,
      'does not complete a partial operator',
      [
        `${ON}textField = keywordField LI`,
        `${ON}textField = keywordField I`,
        `${ON}textField = keywordField NO`,
      ],
      NEXT_ACTIONS
    ),
  ],
};
