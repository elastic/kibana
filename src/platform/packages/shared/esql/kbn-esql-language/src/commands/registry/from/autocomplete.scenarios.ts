/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_WORLD } from '../../../__tests__/scenarios';
import type {
  ExpectedSuggestion,
  Scenario,
  ScenarioTable,
  ScenarioWorld,
} from '../../../__tests__/scenarios';
import { CPS_METADATA_FIELDS, METADATA_FIELDS } from '../options/metadata';
import { getRecommendedQueriesTemplates } from '../options/recommended_queries';

const rows = (
  group: string,
  name: string,
  queries: string[],
  exact: readonly ExpectedSuggestion[],
  world?: Partial<ScenarioWorld>
): Scenario[] => queries.map((query) => ({ group, name, query, world, expect: { exact } }));

// Rows whose cursor is inside a subquery that is already closed.
const inSubquery = (name: string, query: string, exact: string[]): Scenario => ({
  group: '... (FROM <subquery>)',
  name,
  query,
  after: ')',
  expect: { exact },
});

const SOURCES = '... <sources> ...';
const METADATA = '... METADATA <fields>';
const SUBQUERY = '... (FROM <subquery>)';
const STANDALONE = 'standalone (isStandalone) queries';

const SUBQUERIES = ['(FROM $0)', '(ROW $0)', '(TS $0)'];
const BROWSE: ExpectedSuggestion = { text: '', label: 'Browse data sources' };

const visibleIndices = DEFAULT_WORLD.sources.filter(({ hidden }) => !hidden);
const indexNames = visibleIndices.map(({ name }) => name);
const indexNamesExcept = (used: string): string[] => indexNames.filter((name) => name !== used);

const integrationNames = ['nginx', 'k8s'];
const withIntegrations: Partial<ScenarioWorld> = {
  sources: [
    ...visibleIndices,
    ...integrationNames.map((name) => ({ name, hidden: false, type: 'Integration' })),
  ],
};
const dataSourceNames = [...indexNames, ...integrationNames];

const withViews: Partial<ScenarioWorld> = {
  views: [
    { name: 'my_saved_view', query: 'FROM logs | LIMIT 10' },
    { name: 'my-view', query: 'FROM metrics' },
  ],
};
const withDatasets: Partial<ScenarioWorld> = {
  views: [{ name: 'my_saved_view', query: 'FROM logs | LIMIT 10' }],
  datasets: [
    {
      name: 'my_dataset',
      data_source: 'prod_s3_logs',
      resource: 's3://logs-bucket/access/**/*.parquet',
    },
  ],
};

// What accepting the default world's "Logs Count by Host" recommended query inserts.
const LOGS_COUNT_BY_HOST = '\n| STATS COUNT(*) BY host';
const recommendedQueries = [
  LOGS_COUNT_BY_HOST,
  ...getRecommendedQueriesTemplates({
    fromCommand: '',
    timeField: '@timestamp',
    categorizationField: 'textField',
  }).map(({ queryString }) => queryString),
];
const afterSource = ['\n', 'METADATA ', ',', '| ', ...recommendedQueries];
const afterMetadataField = ['\n', ',', '| '];

const standaloneQuery = {
  name: 'Search all metrics',
  query: 'TS metrics-*',
  description: 'Searches all available metrics',
  isStandalone: true,
};

export const fromScenarios: ScenarioTable = {
  command: 'from',
  scenarios: [
    ...rows(
      SOURCES,
      'suggests Browse data sources in empty source slots when enabled',
      ['FROM '],
      [BROWSE, ...indexNames, ...SUBQUERIES],
      { supportsResourceBrowser: true }
    ),
    ...rows(
      SOURCES,
      'suggests Browse data sources after a comma when enabled',
      ['FROM index, '],
      [BROWSE, ...indexNamesExcept('index'), ...SUBQUERIES],
      { supportsResourceBrowser: true }
    ),
    ...rows(
      SOURCES,
      'suggests visible indices and subqueries on space',
      ['from ', 'FROM '],
      [...indexNames, ...SUBQUERIES]
    ),
    {
      group: SOURCES,
      name: 'suggests visible indices and subqueries before a typed index',
      query: 'from ',
      after: 'index',
      expect: { exact: [...indexNames, ...SUBQUERIES] },
    },
    {
      group: SOURCES,
      name: "doesn't create suggestions after an open quote",
      query: 'FROM " ',
      after: '"',
      expect: { exact: [] },
    },
    ...rows(
      SOURCES,
      'does create suggestions after a closed quote',
      ['FROM "lolz", '],
      [...indexNames, ...SUBQUERIES]
    ),
    ...rows(
      SOURCES,
      'doesnt suggest indices twice',
      ['from index, '],
      [...indexNamesExcept('index'), ...SUBQUERIES]
    ),
    {
      group: SOURCES,
      name: 'suggests comma or pipe after complete index name',
      query: 'from index',
      expect: { contains: ['index, ', 'index | '] },
    },
    {
      group: SOURCES,
      name: 'suggests comma or pipe after complete quoted index name',
      query: 'from index, "my-index"',
      expect: { contains: ['"my-index", ', '"my-index" | '] },
    },
    ...rows(
      SOURCES,
      'can suggest integration data sources',
      ['from ', 'FROM ', 'FROM a,', 'from a, ', 'from *,'],
      [...dataSourceNames, ...SUBQUERIES],
      withIntegrations
    ),
    ...rows(
      SOURCES,
      'suggests views alongside sources',
      ['from '],
      [...indexNames, 'my_saved_view', 'my-view', ...SUBQUERIES],
      withViews
    ),
    {
      group: SOURCES,
      name: 'suggests views while typing a name',
      query: 'FROM my_',
      world: withViews,
      expect: {
        contains: [
          { text: 'my_saved_view', detail: 'View' },
          { text: 'my-view', detail: 'View' },
        ],
      },
    },
    ...rows(
      SOURCES,
      'suggests datasets alongside sources and views',
      ['from '],
      [...indexNames, 'my_saved_view', 'my_dataset', ...SUBQUERIES],
      withDatasets
    ),
    {
      group: SOURCES,
      name: 'suggests datasets while typing a name',
      query: 'FROM my_d',
      world: withDatasets,
      expect: { contains: [{ text: 'my_dataset', detail: 'Dataset' }] },
    },

    ...rows(
      METADATA,
      'suggests METADATA, comma, pipe and the recommended queries after the sources',
      ['from a, b '],
      afterSource
    ),
    ...rows(METADATA, 'partially-typed METADATA keyword', ['FROM index1 MET'], ['METADATA ']),
    ...rows(
      METADATA,
      'not before first index',
      ['FROM MET'],
      [...dataSourceNames, 'MET\n'],
      withIntegrations
    ),
    ...rows(
      METADATA,
      'suggests all metadata fields after METADATA, with or without a prefix',
      [
        'from a, b METADATA ',
        'from a, b METADATA _',
        'from a, b METADATA _sour',
        'from a, b METADATA _proj',
      ],
      METADATA_FIELDS
    ),
    ...rows(
      METADATA,
      'suggests CPS metadata fields only when serverless',
      ['from a, b METADATA _proj'],
      [...METADATA_FIELDS, ...CPS_METADATA_FIELDS],
      { isServerless: true }
    ),
    ...rows(
      METADATA,
      'suggests comma and pipe after a metadata field',
      ['from a, b metadata _index ', 'from a, b metadata _index, _source '],
      afterMetadataField
    ),
    ...rows(
      METADATA,
      'suggests only pipe after all the metadata fields',
      [`from a, b metadata ${METADATA_FIELDS.join(', ')} `],
      ['\n', '| ']
    ),
    ...rows(
      METADATA,
      'filters out already used metadata fields',
      ['from a, b metadata _index, '],
      METADATA_FIELDS.filter((field) => field !== '_index')
    ),

    ...rows(
      SUBQUERY,
      'suggests subquery after comma',
      ['from index, '],
      [...indexNamesExcept('index'), ...SUBQUERIES]
    ),
    inSubquery('does not suggest nested subqueries', 'FROM a, (FROM ', indexNames),
    inSubquery(
      'suggests pipe and comma after index in subquery',
      'FROM a, (FROM index ',
      afterSource
    ),
    inSubquery('suggests METADATA keyword in subquery', 'FROM a, (FROM index MET', ['METADATA ']),
    inSubquery(
      'suggests pipe and comma after metadata field in subquery',
      'FROM a, (FROM index METADATA _id ',
      afterMetadataField
    ),

    {
      group: STANDALONE,
      name: 'standalone suggestion appears after space alongside other suggestions',
      query: 'from index ',
      world: {
        recommendedQueries: [standaloneQuery, ...DEFAULT_WORLD.recommendedQueries],
      },
      expect: {
        exact: [
          ...afterSource,
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
