/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable, ScenarioWorld } from '../../../__tests__/scenarios';

const rows = (
  group: string,
  name: string,
  queries: string[],
  exact: string[],
  world?: Partial<ScenarioWorld>
): Scenario[] => queries.map((query) => ({ group, name, query, world, expect: { exact } }));

const FIELD_LIST = 'field list';
const TARGET = 'target = field form';
const SUFFIX = 'suffix = "..." ON form';
const WITH_CLAUSE = 'WITH clause';

const SUFFIX_MODIFIER = 'suffix = "${1:_dense_vector}" ON $0';
const WITH = 'WITH { $0 }';
const END_OF_COMMAND = ['\n', '| '];

const stringColumns = columns({ types: ['keyword', 'text'], followedBySpace: true });

const embeddingEndpoints: Partial<ScenarioWorld> = {
  inferenceEndpoints: [
    { inference_id: 'embed_1', task_type: 'text_embedding' },
    { inference_id: 'inference_1', task_type: 'completion' },
  ],
};

export const denseVectorScenarios: ScenarioTable = {
  command: 'dense_vector',
  scenarios: [
    ...rows(
      FIELD_LIST,
      'suggests the suffix modifier, a target column name, and text and keyword fields',
      ['from a | dense_vector '],
      [SUFFIX_MODIFIER, 'col0 = ', ...stringColumns]
    ),
    ...rows(
      FIELD_LIST,
      'suggests the assignment operator after an unrecognized first name',
      ['from a | dense_vector vec'],
      ['= ', 'col0 = ', ...stringColumns]
    ),
    ...rows(
      FIELD_LIST,
      'suggests more fields, but no target assignment or suffix, after a comma',
      ['from a | dense_vector textField, '],
      stringColumns
    ),
    ...rows(
      FIELD_LIST,
      'suggests continuations after a complete field',
      ['from a | dense_vector keywordField'],
      [WITH, ', ', ...END_OF_COMMAND, 'col0 = ', ...stringColumns]
    ),

    ...rows(
      TARGET,
      'suggests fields, but no further target, inside the assignment',
      ['from a | dense_vector vec = '],
      stringColumns
    ),
    ...rows(
      TARGET,
      'suggests continuations, but no comma, after the assigned field',
      ['from a | dense_vector vec = textField '],
      [WITH, ...END_OF_COMMAND]
    ),
    ...rows(
      TARGET,
      'keeps the comma out while the assigned field is still being typed',
      ['from a | dense_vector vec = textField'],
      [WITH, ...END_OF_COMMAND, ...stringColumns]
    ),
    ...rows(
      TARGET,
      'offers only pipe and newline after a manually typed comma following a named target',
      ['from a | dense_vector vec = textField, '],
      END_OF_COMMAND
    ),
    ...rows(
      TARGET,
      'still offers WITH after a target whose quoted name contains a comma',
      ['from a | dense_vector `my,vec` = textField '],
      [WITH, ...END_OF_COMMAND]
    ),

    ...rows(
      SUFFIX,
      'suggests only ON while the suffix clause awaits it',
      [
        'from a | dense_vector suffix = "_dense_vector"',
        'from a | dense_vector suffix = "_dense_vector" ',
        'from a | dense_vector SUFFIX = "_dv" ',
        'from a | dense_vector suffix = "_dv" O',
      ],
      ['ON ']
    ),
    ...rows(
      SUFFIX,
      'suggests text and keyword fields, but no target assignment, after ON',
      ['from a | dense_vector suffix = "_dv" ON '],
      stringColumns
    ),
    ...rows(
      SUFFIX,
      'suggests continuations after a field in the ON list',
      ['from a | dense_vector suffix = "_dv" ON textField '],
      [...END_OF_COMMAND, ', ', WITH]
    ),

    ...rows(
      WITH_CLAUSE,
      'suggests the map opener once WITH is typed',
      ['from a | dense_vector textField WITH '],
      ['{ "inference_id": "$0" }']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests parameter keys inside an empty map',
      ['from a | dense_vector textField WITH { '],
      ['"inference_id": "$0"', '"type": "$0"', '"timeout": "$0"']
    ),
    ...rows(
      WITH_CLAUSE,
      'does not suggest an already-used parameter key after a comma',
      ['from a | dense_vector textField WITH { "inference_id": "inference_1", '],
      ['"type": "$0"', '"timeout": "$0"']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests the text embedding inference endpoints as inference_id values',
      ['from a | dense_vector textField WITH { "inference_id": "'],
      ['"embed_1"'],
      embeddingEndpoints
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests no endpoint of another task type',
      ['from a | dense_vector textField WITH { "inference_id": "'],
      []
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests text and image as type values',
      ['from a | dense_vector textField WITH { "type": "'],
      ['"text"', '"image"']
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests a default duration as the timeout value',
      ['from a | dense_vector textField WITH { "timeout": "'],
      ['"30s"']
    ),
    ...rows(
      WITH_CLAUSE,
      'does not suggest values for an unsupported parameter',
      ['from a | dense_vector textField WITH { "unsupported_param": "'],
      []
    ),
    ...rows(
      WITH_CLAUSE,
      'suggests only pipe and newline after a complete map',
      ['from a | dense_vector textField WITH { "inference_id": "inference_1" } '],
      END_OF_COMMAND
    ),
  ],
};
