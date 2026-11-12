/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns, functions } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';
import { esqlCommandRegistry } from '..';
import { getCommandAutocompleteDefinitions } from '../complete_items';

const rows = (group: string, name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const BRANCHES = 'FORK ...';
const SUBCOMMANDS = '(COMMAND ... | COMMAND ...)';
const DELEGATION = 'delegation to subcommands';
const USER_DEFINED = 'user-defined columns';
const FILTERING = 'command filtering';

const STRING_COMPARABLE_TYPES = ['text', 'keyword', 'ip', 'version'] as const;
const AVG_TYPES = [
  'double',
  'integer',
  'long',
  'aggregate_metric_double',
  'exponential_histogram',
  'tdigest',
] as const;
const ACOS_TYPES = ['double', 'long', 'integer', 'unsigned_long'] as const;

const NEW_BRANCH = '($0)';
const END_OF_COMMAND = ['\n', '| '];
// The suggested name for the new column, followed by the assignment.
const newColumn = 'col0 = ';

const processingCommands = esqlCommandRegistry.getProcessingCommandNames();
const forkSubcommands = getCommandAutocompleteDefinitions(
  processingCommands.filter((name) => name !== 'fork')
).map(({ text }) => text);
const commandTexts = (names: string[]): string[] => names.map((name) => `${name.toUpperCase()} `);
const hiddenCommands = processingCommands.filter(
  (name) => esqlCommandRegistry.getCommandByName(name)?.metadata?.hidden === true
);

const allColumns = columns();
const spacedColumns = columns({ followedBySpace: true });
const whereFunctions = functions({ availableIn: 'where', scalar: true });
const statsFunctions = [
  ...functions({ availableIn: 'stats', aggregation: true }),
  ...functions({ availableIn: 'stats', grouping: true }),
  ...functions({ availableIn: 'stats', scalar: true }),
];
const comparableWithText = [
  ...columns({ types: STRING_COMPARABLE_TYPES }),
  ...functions({ availableIn: 'where', scalar: true, returning: STRING_COMPARABLE_TYPES }),
];
const evalExpression = [
  newColumn,
  ...spacedColumns,
  ...functions({ availableIn: 'eval', scalar: true }),
];

export const forkScenarios: ScenarioTable = {
  command: 'fork',
  scenarios: [
    ...rows(
      BRANCHES,
      'suggests new branch on empty command',
      ['FROM a | FORK ', 'FROM a | fork '],
      [NEW_BRANCH]
    ),
    ...rows(
      BRANCHES,
      'suggests pipe and new branch after complete branch',
      ['FROM a | FORK (LIMIT 100) ', 'FROM a | FORK (LIMIT 100) (SORT keywordField ASC) '],
      [NEW_BRANCH, ...END_OF_COMMAND]
    ),

    ...rows(
      SUBCOMMANDS,
      'suggests FORK sub commands in an open branch',
      ['FROM a | FORK (', 'FROM a | FORK (WHERE 1) ('],
      forkSubcommands
    ),
    ...rows(
      SUBCOMMANDS,
      'suggests FORK subcommands after in-branch pipe',
      [
        'FROM a | FORK (WHERE keywordField IS NULL | LIMIT 1234 | ',
        'FROM a | FORK (SORT longField ASC NULLS LAST) (WHERE keywordField IS NULL | LIMIT 1234 | ',
      ],
      forkSubcommands
    ),
    ...[
      'FROM a | FORK (WHERE keywordField IS NOT NULL ',
      'FROM a | FORK (LIMIT 1234 ',
      'FROM a | FORK (SORT keywordField ASC ',
      'FROM a | FORK (DISSECT keywordField "%{firstWord}" APPEND_SEPARATOR=":" ',
    ].map(
      (query): Scenario => ({
        group: SUBCOMMANDS,
        name: 'suggests pipe after complete subcommands',
        query,
        expect: { contains: ['| '] },
      })
    ),

    ...rows(
      DELEGATION,
      'where: at the start of the expression',
      ['FROM a | FORK (WHERE ', 'FROM a | FORK (WHERE key'],
      [...spacedColumns, ...whereFunctions]
    ),
    ...rows(
      DELEGATION,
      'where: after a comparison with a text field',
      ['FROM a | FORK (WHERE textField != ', 'FROM a | FORK (WHERE textField != text '],
      comparableWithText
    ),
    ...rows(DELEGATION, 'limit', ['FROM a | FORK (LIMIT '], ['10 ', '100 ', '1000 ']),
    ...rows(
      DELEGATION,
      'sort: at the start of the expression',
      ['FROM a | FORK (SORT '],
      [...allColumns, ...functions({ availableIn: 'sort', scalar: true })]
    ),
    ...rows(
      DELEGATION,
      'sort: after a field',
      ['FROM a | FORK (SORT integerField '],
      [
        'ASC',
        'DESC',
        ', ',
        ...END_OF_COMMAND,
        'NULLS FIRST',
        'NULLS LAST',
        ...functions({ availableIn: 'sort', operators: true, accepting: ['integer'] }),
      ]
    ),
    ...rows(
      DELEGATION,
      'dissect: fields',
      ['FROM a | FORK (DISSECT '],
      columns({ types: ['keyword', 'text'], followedBySpace: true })
    ),
    ...rows(
      DELEGATION,
      'dissect: pattern',
      ['FROM a | FORK (DISSECT keywordField '],
      ['"%{firstWord}" ']
    ),
    ...rows(
      DELEGATION,
      'dissect: after the pattern',
      ['FROM a | FORK (DISSECT keywordField "" '],
      ['APPEND_SEPARATOR = ', ...END_OF_COMMAND]
    ),
    ...rows(
      DELEGATION,
      'keep and drop: fields',
      ['FROM a | FORK (KEEP ', 'FROM a | FORK (DROP '],
      allColumns
    ),
    ...rows(
      DELEGATION,
      'keep and drop: after a field',
      ['FROM a | FORK (KEEP integerField ', 'FROM a | FORK (DROP integerField '],
      [',', ...END_OF_COMMAND]
    ),
    ...rows(DELEGATION, 'mv_expand: fields', ['FROM a | FORK (MV_EXPAND '], spacedColumns),
    ...rows(
      DELEGATION,
      'mv_expand: after a field',
      ['FROM a | FORK (MV_EXPAND integerField '],
      END_OF_COMMAND
    ),
    ...rows(
      DELEGATION,
      'sample: percentages',
      ['FROM a | FORK (SAMPLE '],
      ['.001 ', '.01 ', '.1 ']
    ),
    ...rows(
      DELEGATION,
      'sample: after a percentage',
      ['FROM a | FORK (SAMPLE 0.01 '],
      END_OF_COMMAND
    ),
    ...rows(
      DELEGATION,
      'rename: fields',
      ['FROM a | FORK (RENAME '],
      [newColumn, ...spacedColumns]
    ),
    ...rows(
      DELEGATION,
      'rename: after an existing field',
      ['FROM a | FORK (RENAME textField '],
      ['AS ']
    ),
    ...rows(DELEGATION, 'rename: after a new name', ['FROM a | FORK (RENAME field '], ['= ']),
    ...rows(
      DELEGATION,
      'change_point: value columns',
      ['FROM a | FORK (CHANGE_POINT '],
      columns({
        types: ['integer', 'long', 'double', 'unsigned_long', 'counter_integer'],
        followedBySpace: true,
      })
    ),
    ...rows(
      DELEGATION,
      'change_point: after the value column',
      ['FROM a | FORK (CHANGE_POINT value '],
      ['ON ', 'AS ', 'BY ', ...END_OF_COMMAND]
    ),
    ...rows(
      DELEGATION,
      'change_point: fields after ON',
      ['FROM a | FORK (CHANGE_POINT value on '],
      spacedColumns
    ),
    ...rows(
      DELEGATION,
      'lookup join after command name',
      ['FROM a | FORK (LOOKUP JOIN '],
      [
        // The text of the "Create lookup index" item when no index name is typed.
        '',
        'join_index ',
        'join_index_with_alias ',
        'lookup_index ',
        'join_index_alias_1 $0',
        'join_index_alias_2 $0',
      ]
    ),
    {
      group: DELEGATION,
      name: 'lookup join after ON keyword',
      query: 'FROM a | FORK (LOOKUP JOIN join_index ON ',
      expect: {
        contains: [
          'textField ',
          'keywordField ',
          'booleanField ',
          'joinIndexOnlyField ',
          'STARTS_WITH($0)',
          'CONTAINS($0)',
        ],
      },
    },
    ...rows(
      DELEGATION,
      'stats: first empty expression',
      ['FROM a | FORK (STATS '],
      ['BY ', newColumn, ...statsFunctions]
    ),
    ...rows(
      DELEGATION,
      'stats: empty expression after a comma',
      ['FROM a | FORK (STATS AVG(integerField), '],
      [newColumn, ...statsFunctions]
    ),
    ...rows(
      DELEGATION,
      'stats: within an aggregation function',
      ['FROM a | FORK (STATS AVG('],
      [
        ...columns({ types: AVG_TYPES }),
        ...functions({
          availableIn: 'stats',
          returning: AVG_TYPES,
          scalar: true,
          grouping: true,
        }),
      ]
    ),
    ...rows(
      DELEGATION,
      'stats: within a function in the BY clause',
      ['FROM a | FORK (STATS AVG(integerField) BY ACOS('],
      [
        ...columns({ types: ACOS_TYPES }),
        ...functions({
          availableIn: 'stats',
          returning: ACOS_TYPES,
          scalar: true,
          grouping: true,
          except: ['acos'],
        }),
      ]
    ),
    ...rows(
      DELEGATION,
      'stats: supports STATS ... WHERE',
      ['FROM a | FORK (STATS AVG(integerField) WHERE integerField '],
      [
        ': $0',
        ...functions({
          availableIn: 'stats_where',
          operators: true,
          withoutAssignment: true,
          accepting: ['integer'],
        }),
      ]
    ),
    ...rows(
      DELEGATION,
      'eval: empty expression',
      ['FROM a | FORK (EVAL ', 'FROM a | FORK (EVAL ACOS(integerField), '],
      evalExpression
    ),
    ...rows(
      DELEGATION,
      'eval: within a function',
      ['FROM a | FORK (EVAL ACOS( '],
      [
        ...columns({ types: ACOS_TYPES }),
        ...functions({
          availableIn: 'eval',
          returning: ACOS_TYPES,
          scalar: true,
          except: ['acos'],
        }),
      ]
    ),

    {
      group: USER_DEFINED,
      name: 'suggests user-defined columns from earlier in this branch',
      query: 'FROM a | FORK (EVAL foo = 1 | EVAL bar = 2 | WHERE ',
      expect: { contains: ['foo ', 'bar '] },
    },
    {
      group: USER_DEFINED,
      name: 'does NOT suggest user-defined columns from another branch',
      query: 'FROM a | FORK (EVAL foo = 1) (WHERE ',
      expect: { excludes: ['foo', 'foo '] },
    },

    {
      group: FILTERING,
      name: 'does NOT suggest source commands',
      query: 'FROM a | FORK (',
      expect: { excludes: commandTexts(esqlCommandRegistry.getSourceCommandNames()) },
    },
    {
      group: FILTERING,
      name: 'does NOT suggest hidden processing commands',
      query: 'FROM a | FORK (',
      expect: { excludes: commandTexts(hiddenCommands) },
    },
    {
      group: FILTERING,
      name: 'does NOT suggest FORK command itself',
      query: 'FROM a | FORK (',
      expect: { excludes: ['FORK '] },
    },
  ],
};
