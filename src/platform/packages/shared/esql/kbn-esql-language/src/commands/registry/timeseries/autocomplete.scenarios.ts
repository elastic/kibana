/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scenario, ScenarioTable, ScenarioWorld } from '../../../__tests__/scenarios';
import { METADATA_FIELDS } from '../options/metadata';

const rows = (
  group: string,
  name: string,
  queries: string[],
  exact: string[],
  world?: Partial<ScenarioWorld>
): Scenario[] => queries.map((query) => ({ group, name, query, world, expect: { exact } }));

const SOURCES = '... <sources> ...';
const METADATA = '... METADATA <fields>';
const STANDALONE = 'standalone (isStandalone) queries';

const timeseriesRate = { name: 'Timeseries rate', query: 'TS logs* | STATS SUM(RATE(bytes)' };
// What accepting the "Timeseries rate" recommended query inserts.
const TIMESERIES_RATE_TEXT = '\n| STATS';

const withTimeseriesRate: Partial<ScenarioWorld> = { recommendedQueries: [timeseriesRate] };
const withStandaloneQuery: Partial<ScenarioWorld> = {
  recommendedQueries: [
    {
      name: 'Search all metrics',
      query: 'TS metrics-*',
      description: 'Searches all available metrics',
      isStandalone: true,
    },
    timeseriesRate,
  ],
};

const AFTER_SOURCE = ['\n', 'METADATA ', ',', '| '];

const timeseriesIndices = [
  { text: 'timeseries_index ', label: 'timeseries_index', detail: 'Timeseries' },
  {
    text: 'timeseries_index_with_alias ',
    label: 'timeseries_index_with_alias',
    detail: 'Timeseries',
  },
  { text: 'time_series_index ', label: 'time_series_index', detail: 'Timeseries' },
  { text: 'timeseries_index_alias_1 $0', label: 'timeseries_index_alias_1', detail: 'Alias' },
  { text: 'timeseries_index_alias_2 $0', label: 'timeseries_index_alias_2', detail: 'Alias' },
];

export const timeseriesScenarios: ScenarioTable = {
  command: 'ts',
  scenarios: [
    {
      group: SOURCES,
      name: 'suggests Browse data sources in empty source slots when enabled',
      query: 'TS ',
      world: { supportsResourceBrowser: true },
      expect: {
        exact: [{ text: '', label: 'Browse data sources' }, ...timeseriesIndices],
      },
    },
    {
      group: SOURCES,
      name: 'suggests timeseries indices and aliases, and tells them apart',
      query: 'TS ',
      expect: { exact: timeseriesIndices },
    },
    {
      group: SOURCES,
      name: 'can suggest timeseries after one already selected',
      query: 'TS timeseries_index,  ',
      expect: { exact: ['timeseries_index_with_alias', 'time_series_index'] },
    },

    ...rows(
      METADATA,
      'suggests METADATA, comma, pipe and the recommended queries after a source',
      ['ts time_series_index '],
      [...AFTER_SOURCE, TIMESERIES_RATE_TEXT],
      withTimeseriesRate
    ),
    ...rows(
      METADATA,
      'suggests all metadata fields after METADATA, with or without a prefix',
      [
        'ts time_series_index METADATA ',
        'ts time_series_index METADATA _',
        'ts time_series_index METADATA _sour',
      ],
      METADATA_FIELDS
    ),
    ...rows(
      METADATA,
      'suggests comma and pipe after a metadata field',
      ['ts time_series_index metadata _index ', 'ts time_series_index metadata _index, _source '],
      ['\n', ',', '| ']
    ),
    ...rows(
      METADATA,
      'suggests only pipe after all the metadata fields',
      [`ts time_series_index metadata ${METADATA_FIELDS.join(', ')} `],
      ['\n', '| ']
    ),
    ...rows(
      METADATA,
      'filters out already used metadata fields',
      ['ts time_series_index metadata _index, '],
      METADATA_FIELDS.filter((field) => field !== '_index')
    ),

    {
      group: STANDALONE,
      name: 'standalone suggestion appears after space alongside other suggestions',
      query: 'ts timeseries_index ',
      world: withStandaloneQuery,
      expect: {
        exact: [
          ...AFTER_SOURCE,
          TIMESERIES_RATE_TEXT,
          {
            text: '',
            label: 'Search all metrics',
            command: {
              id: 'esql.recommendedQuery.accept',
              title: 'Accept recommended query',
              arguments: [{ queryLabel: 'Search all metrics', queryText: 'TS metrics-*' }],
            },
          },
        ],
      },
    },
  ],
};
