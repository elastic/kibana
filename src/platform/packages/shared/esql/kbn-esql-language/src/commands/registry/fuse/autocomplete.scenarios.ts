/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (group: string, name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const ARGUMENTS = 'FUSE arguments';
const SCORE_BY = 'SCORE BY';
const GROUP_BY = 'GROUP BY';
const KEY_BY = 'KEY BY';
const WITH = 'WITH';

const WITH_MAP = 'WITH { $0 }';
const END_OF_COMMAND = ['\n', '| '];

const stringColumns = columns({ types: ['keyword', 'text'] });
const stringColumnsExcept = (...used: string[]): string[] =>
  stringColumns.filter((text) => !used.includes(text));

export const fuseScenarios: ScenarioTable = {
  command: 'fuse',
  scenarios: [
    ...rows(
      ARGUMENTS,
      'suggests all FUSE arguments + FUSE types if FUSE has no arguments',
      ['FROM a | FUSE '],
      ['linear ', 'rrf ', 'SCORE BY ', 'KEY BY ', 'GROUP BY ', WITH_MAP, ...END_OF_COMMAND]
    ),
    ...rows(
      ARGUMENTS,
      'does not suggest FUSE types if FUSE already has one',
      ['FROM a | FUSE linear '],
      ['SCORE BY ', 'KEY BY ', 'GROUP BY ', WITH_MAP, ...END_OF_COMMAND]
    ),
    ...rows(
      ARGUMENTS,
      'does not suggest already used arguments',
      ['FROM a | FUSE linear SCORE BY x KEY BY y '],
      ['GROUP BY ', WITH_MAP, ...END_OF_COMMAND]
    ),
    ...rows(
      ARGUMENTS,
      'does not suggest FUSE type if another argument has been added',
      ['FROM a | FUSE SCORE BY x '],
      ['KEY BY ', 'GROUP BY ', WITH_MAP, ...END_OF_COMMAND]
    ),

    ...rows(
      SCORE_BY,
      'suggests double fields after SCORE BY',
      ['FROM a | FUSE linear SCORE BY ', 'FROM a | FUSE linear SCORE BY doubleFi'],
      columns({ types: 'double', followedBySpace: true })
    ),

    ...rows(
      GROUP_BY,
      'suggests string fields after GROUP BY',
      ['FROM a | FUSE linear GROUP BY ', 'FROM a | FUSE linear GROUP BY textFi'],
      columns({ types: ['keyword', 'text'], followedBySpace: true })
    ),

    ...rows(
      KEY_BY,
      'suggests string fields after KEY BY',
      ['FROM a | FUSE linear KEY BY ', 'FROM a | FUSE linear KEY BY textFi'],
      stringColumns
    ),
    ...rows(
      KEY_BY,
      'suggests the string fields that are not listed yet after a comma following KEY BY',
      [
        'FROM a | FUSE linear KEY BY keywordField, ',
        'FROM a | FUSE linear KEY BY keywordField, textFi',
      ],
      stringColumnsExcept('keywordField')
    ),
    ...rows(
      KEY_BY,
      'does not suggest already used fields after a comma following KEY BY',
      ['FROM a | FUSE KEY BY keywordField, textField, '],
      stringColumnsExcept('keywordField', 'textField')
    ),
    ...rows(
      KEY_BY,
      'suggests other config arguments after KEY BY fields',
      ['FROM a | FUSE KEY BY keywordField, textField '],
      ['SCORE BY ', 'GROUP BY ', WITH_MAP, ...END_OF_COMMAND]
    ),
    ...rows(
      KEY_BY,
      'suggests other config arguments and a comma immediately after a field',
      ['FROM a | FUSE KEY BY keywordField, textField'],
      [
        'textField \n',
        'textField GROUP BY ',
        'textField SCORE BY ',
        'textField WITH { $0 }',
        'textField | ',
        'textField, ',
      ]
    ),
    ...rows(
      KEY_BY,
      'suggests no fields when KEY BY follows the WITH map',
      ['FROM a | FUSE linear SCORE BY keywordField GROUP BY keywordField WITH {} KEY BY '],
      ['KEY BY ', ...END_OF_COMMAND]
    ),

    ...rows(
      WITH,
      'suggests empty map if WITH is empty',
      ['FROM a | FUSE linear WITH '],
      ['{ $0 }']
    ),
    ...rows(
      WITH,
      'suggests rank_constant and weights as parameters when the FUSE method is rrf or absent',
      ['FROM a | FUSE rrf WITH { ', 'FROM a | FUSE WITH { '],
      ['"rank_constant": ', '"weights": { $0 }']
    ),
    ...rows(
      WITH,
      'suggests 60 as default value for rank_constant parameter',
      ['FROM a | FUSE rrf WITH { "rank_constant": '],
      ['60']
    ),
    ...rows(
      WITH,
      'suggests normalizer and weights as parameters when FUSE method is linear',
      ['FROM a | FUSE linear WITH { '],
      ['"normalizer": "$0"', '"weights": { $0 }']
    ),
    ...rows(
      WITH,
      'suggests parameter values for normalizer parameter',
      ['FROM a | FUSE linear WITH { "normalizer": "'],
      ['"none"', '"minmax"']
    ),
    ...rows(
      WITH,
      'suggests nothing within weights sub map',
      [
        'FROM a | FUSE linear WITH { "weights": { ',
        'FROM a | FUSE linear WITH { "weights": { "',
        'FROM a | FUSE linear WITH { "weights": { "fork1": ',
        'FROM a | FUSE linear WITH { "weights": { "fork1": "',
      ],
      []
    ),
  ],
};
