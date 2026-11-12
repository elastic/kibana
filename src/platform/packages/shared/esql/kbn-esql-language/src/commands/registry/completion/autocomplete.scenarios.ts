/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns, dateDiffUnits, functions } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (name: string, queries: string[], exact: string[], group?: string): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const EXPRESSIONS = 'expressions in prompt';
const CONSTRAINTS = 'function parameter constraints';

const DEFAULT_PROMPT = '"${0:Your prompt to the LLM.}"';
const WITH = 'WITH { $0 }';
const INFERENCE_ID_KEY = '"inference_id": "$0"';

const promptSuggestions = [
  'col0 = ',
  ...columns({ types: ['keyword', 'text'], followedBySpace: true }),
  ...functions({
    availableIn: 'completion',
    returning: ['text', 'keyword', 'unknown'],
    scalar: true,
  }).map((text) => `${text} `),
];

export const completionScenarios: ScenarioTable = {
  command: 'completion',
  scenarios: [
    ...rows(
      'suggests the prompt suggestions and a default prompt after COMPLETION',
      ['FROM a | COMPLETION '],
      [DEFAULT_PROMPT, ...promptSuggestions]
    ),
    ...rows(
      'suggests the prompt suggestions when typing a column',
      ['FROM a | COMPLETION kubernetes.some'],
      promptSuggestions
    ),
    ...rows(
      'suggests the assignment after a new column name',
      ['FROM a | COMPLETION newColumn '],
      ['= ']
    ),
    ...rows(
      'suggests WITH after a column that already exists',
      ['FROM a | COMPLETION textField '],
      [WITH]
    ),
    ...rows('suggests WITH after a param as prompt', ['FROM a | COMPLETION ? '], [WITH]),
    ...rows(
      'suggests WITH after the prompt',
      ['FROM a | COMPLETION "prompt" ', 'FROM a | COMPLETION "prompt" WIT'],
      [WITH]
    ),
    ...rows(
      'suggests opening braces when WITH is already typed',
      ['FROM a | COMPLETION "prompt" WITH '],
      [`{ ${INFERENCE_ID_KEY} }`]
    ),
    ...rows(
      'suggests the inference_id parameter within the named parameters map',
      [
        'FROM a | COMPLETION "prompt" WITH {',
        'FROM a | COMPLETION "prompt" WITH { ',
        'FROM a | COMPLETION "prompt" WITH {\n      ',
      ],
      [INFERENCE_ID_KEY]
    ),
    ...rows(
      'suggests inference endpoints as the values for inference_id',
      [
        'FROM a | COMPLETION "prompt" WITH { "inference_id": "',
        'FROM a | COMPLETION "prompt" WITH { "inference_id": "i',
        'FROM a | COMPLETION "prompt" WITH { "inference_id": "inf',
      ],
      ['"inference_1"']
    ),
    ...rows(
      'does not suggest anything if all the parameters are already provided',
      ['FROM a | COMPLETION "prompt" WITH { "inference_id": "inference_1", '],
      []
    ),
    ...rows(
      'does not suggest anything if the parameter name is unsupported',
      ['FROM a | COMPLETION "prompt" WITH { "unsupported_param": "'],
      []
    ),
    ...rows(
      'suggests pipe after complete command',
      ['FROM a | COMPLETION "prompt" WITH { "inference_id": "inference_1" }'],
      ['\n', '| ']
    ),
    ...rows(
      'suggests pipe after incomplete but enclosed map expression',
      [
        'FROM a | COMPLETION "prompt" WITH { "inference_id": "" }',
        'FROM a | COMPLETION "prompt" WITH { "inference_id": "" } ',
      ],
      ['\n', '| ']
    ),

    {
      group: EXPRESSIONS,
      name: 'supports string functions and enforces type compatibility',
      query: 'FROM a | COMPLETION ',
      expect: {
        contains: ['CONCAT($0) ', 'textField ', 'keywordField '],
        excludes: ['doubleField '],
      },
    },
    {
      group: EXPRESSIONS,
      name: 'suggests creating a control for the prompt expression',
      query: 'FROM a | COMPLETION ',
      world: { supportsControls: true },
      expect: {
        contains: [
          {
            text: '',
            label: 'Create control',
            command: {
              id: 'esql.control.fields.create',
              title: 'Click to create',
              arguments: [{ triggerSource: 'smart_suggestion' }],
            },
          },
        ],
      },
    },

    ...rows(
      'suggests only constants for the first argument of DATE_DIFF',
      ['from a | completion CONCAT(field, DATE_DIFF('],
      dateDiffUnits(),
      CONSTRAINTS
    ),
    {
      group: CONSTRAINTS,
      name: 'includes numeric fields for ABS',
      query: 'from a | completion CONCAT("Number: ", ABS(',
      expect: { contains: columns({ types: ['double', 'integer', 'long', 'unsigned_long'] }) },
    },
  ],
};
