/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { operators } from '../../../__tests__/scenarios';
import type { ExpectedSuggestion, ScenarioTable } from '../../../__tests__/scenarios';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';

const INDEX = '... <index> ...';
const ON = '... ON <condition>';

const CREATE_INDEX_COMMAND = 'esql.lookup_index.create';

const createIndexItem = (
  indexName: string,
  rangeToReplace?: { start: number; end: number }
): ExpectedSuggestion => ({
  ...(rangeToReplace ? { rangeToReplace } : {}),
  text: indexName,
  label: indexName ? `Create lookup index "${indexName}"` : 'Create lookup index',
  category: SuggestionCategory.CUSTOM_ACTION,
  command: {
    arguments: [{ indexName }],
    id: CREATE_INDEX_COMMAND,
    title: 'Click to create',
  },
  detail: 'Click to create',
  filterText: indexName,
  incomplete: true,
  kind: 'Issue',
});

const lookupIndices = [
  { text: 'join_index ', label: 'join_index', detail: 'Lookup' },
  { text: 'join_index_with_alias ', label: 'join_index_with_alias', detail: 'Lookup' },
  { text: 'lookup_index ', label: 'lookup_index', detail: 'Lookup' },
  { text: 'join_index_alias_1 $0', label: 'join_index_alias_1', detail: 'Alias' },
  { text: 'join_index_alias_2 $0', label: 'join_index_alias_2', detail: 'Alias' },
];

export const joinScenarios: ScenarioTable = {
  command: 'join',
  scenarios: [
    {
      group: '<type> JOIN ...',
      name: 'suggests the command with its description and continuation',
      query: 'FROM index | LOOKUP J',
      expect: {
        exact: [
          {
            label: 'LOOKUP JOIN',
            text: 'LOOKUP JOIN $0',
            detail: 'Join with a "lookup" mode index',
            kind: 'Keyword',
          },
        ],
      },
    },

    {
      group: INDEX,
      name: 'suggests lookup indices, aliases, and a create index command',
      query: 'FROM index | LEFT JOIN ',
      expect: { exact: [createIndexItem(''), ...lookupIndices] },
    },
    {
      group: INDEX,
      name: 'suggests indices based on a fragment',
      query: 'FROM index | LOOKUP JOIN join_',
      expect: { exact: [createIndexItem('join_'), ...lookupIndices] },
    },
    {
      group: INDEX,
      name: 'does not suggest the create index command when the index already exists',
      query: 'FROM index | LEFT JOIN join_index',
      expect: { exact: [] },
    },
    {
      group: INDEX,
      name: 'does not suggest the create index command when the index already exists as an alias',
      query: 'FROM index | LEFT JOIN join_index_alias_1',
      expect: { exact: [] },
    },
    {
      group: INDEX,
      name: 'does not suggest the create index command without the required privileges',
      query: 'FROM index | LEFT JOIN ',
      world: { canCreateLookupIndex: false },
      expect: { exact: lookupIndices },
    },
    {
      group: INDEX,
      name: 'suggests the create index command with the user input',
      query: 'FROM index | LEFT JOIN new_join_index',
      expect: {
        exact: [createIndexItem('new_join_index', { start: 23, end: 37 }), ...lookupIndices],
      },
    },
    {
      group: INDEX,
      name: 'strips the coordinator prefix from the create index command',
      query: 'FROM index | LOOKUP JOIN _coordinator:new_join_index',
      expect: { exact: [createIndexItem('new_join_index'), ...lookupIndices] },
    },

    {
      group: ON,
      name: 'shows the ON keyword',
      query: 'FROM index | LOOKUP JOIN join_index ',
      expect: { exact: ['ON '] },
    },
    {
      group: ON,
      name: 'suggests fields of both indices and functions after ON',
      query: 'FROM index | LOOKUP JOIN join_index ON ',
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
    {
      group: ON,
      name: 'suggests fields after comma',
      query: 'FROM index | LOOKUP JOIN join_index ON textField, ',
      expect: { contains: ['keywordField '] },
    },
    {
      group: ON,
      name: 'suggests fields with field prefix',
      query: 'FROM index | LOOKUP JOIN join_index ON keyw',
      expect: { contains: ['keywordField '] },
    },
    {
      group: ON,
      name: 'suggests fields after comparison operator',
      query: 'FROM index | LOOKUP JOIN join_index ON textField == ',
      expect: { contains: ['keywordField', 'joinIndexOnlyField'] },
    },
    {
      group: ON,
      name: 'suggests fields and full-text search functions after AND',
      query: 'FROM index | LOOKUP JOIN join_index ON textField == "value" AND ',
      expect: { contains: ['keywordField', 'joinIndexOnlyField', 'MATCH($0)', 'QSTR("""$0""")'] },
    },
    {
      group: ON,
      name: 'suggests fields after comma in second condition',
      query: 'FROM index | LOOKUP JOIN join_index ON textField == "value", ',
      expect: { contains: ['keywordField ', 'booleanField '] },
    },
    {
      group: ON,
      name: 'suggests logical operators, comma and pipe after IS NULL',
      query: 'FROM index | LOOKUP JOIN join_index ON textField IS NULL ',
      expect: { exact: [...operators('logical'), ', ', '| ', '\n'] },
    },
    {
      group: ON,
      name: 'suggests all boolean operators after field',
      query: 'FROM index | LOOKUP JOIN join_index ON keywordField ',
      expect: {
        exact: operators('comparison', 'match', 'patternMatch', 'in', 'nullCheck'),
      },
    },
    {
      group: ON,
      name: 'suggests logical operators, comma and pipe after complete expression',
      query: 'FROM index | LOOKUP JOIN join_index ON keywordField == "value" ',
      expect: { exact: [...operators('logical'), ', ', '| ', '\n'] },
    },
  ],
};
