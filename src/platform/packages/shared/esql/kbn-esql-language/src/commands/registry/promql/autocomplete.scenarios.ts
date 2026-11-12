/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLVariableType } from '@kbn/esql-types';
import type {
  Scenario,
  ScenarioExpectation,
  ScenarioTable,
  ScenarioWorld,
} from '../../../__tests__/scenarios';
import { getFieldNamesByType } from '../../../__tests__/commands/autocomplete';
import { ESQL_NUMBER_TYPES, ESQL_STRING_TYPES } from '../../definitions/types';
import { suggestFunctions } from '../../definitions/utils/autocomplete/promql/query_positions/functions';
import { suggestOperators } from '../../definitions/utils/autocomplete/promql/query_positions/operators';
import { TIME_SYSTEM_PARAMS } from '../../definitions/utils/literals';
import {
  getPromqlParamKeySuggestions,
  promqlByCompleteItem,
  promqlLabelSelectorItem,
  promqlRangeSelectorItem,
} from '../complete_items';
import { getPromqlParam, PROMQL_PARAM_NAMES } from './utils';

interface RowOptions {
  /** Where the cursor is in the query. The end of the query when absent. */
  readonly cursor?: number;
  readonly world?: Partial<ScenarioWorld>;
}

const row = (
  group: string,
  name: string,
  query: string,
  expect: ScenarioExpectation,
  { cursor = query.length, world }: RowOptions = {}
): Scenario => ({
  group,
  name,
  query: query.slice(0, cursor),
  after: query.slice(cursor),
  world,
  expect,
});

const rows = (
  group: string,
  name: string,
  queries: string[],
  expect: ScenarioExpectation,
  options?: RowOptions
): Scenario[] => queries.map((query) => row(group, name, query, expect, options));

// The position right after the first occurrence of a text.
const after = (query: string, text: string): number => query.indexOf(text) + text.length;

const AFTER_KEYWORD = 'after PROMQL keyword';
const PARAM_KEYWORD = 'param keyword suggestions';
const INSIDE_QUERY = 'inside query';
const AGGREGATION = 'aggregation functions (by clause)';
const AFTER_PARAMS = 'after params (before query)';
const AFTER_QUERY = 'after query (pipe suggestions)';
const PARAM_VALUE = 'param value suggestions';
const INDEX = 'index= suggestions';
const LABEL_SELECTOR = 'label selector suggestions';
const CLASSIFIER = 'classifier edge cases';

const PIPE = '| ';
const ASSIGN = '= ';
const NEW_COLUMN = 'col0 = ';
const SCALAR_PLACEHOLDER = '${0:0}';
const BY = promqlByCompleteItem.text;
const BY_LABEL = promqlByCompleteItem.label;
const LABEL_SELECTOR_LABEL = promqlLabelSelectorItem.label;
const RANGE_SELECTOR_LABEL = promqlRangeSelectorItem.label;

const paramTexts = getPromqlParamKeySuggestions().map(({ text }) => text);
const paramNames = [...PROMQL_PARAM_NAMES];
const promqlFunctions = suggestFunctions();
const functionLabels = promqlFunctions.map(({ label }) => label);
const wrappedFunctionTexts = promqlFunctions.slice(0, 1).map(({ text }) => `(${text})`);
const operatorLabels = suggestOperators().map(({ label }) => label);
const stepValues = getPromqlParam('step')?.suggestedValues ?? [];

const metricNames = getFieldNamesByType(ESQL_NUMBER_TYPES, true);
const metricTexts = metricNames.map((name) => `${name} `);
const labelNames = getFieldNamesByType(ESQL_STRING_TYPES, true);

const ALL_PARAMS = 'PROMQL index=metrics step=5m start=?_tstart end=?_tend ';
const NESTED_RANGE =
  'PROMQL step = "5m" sum(avg(quantile_over_time(0, bytes{event.dataset="value"} [5m]) ))';
const COMPLETE_ASSIGNMENT =
  'PROMQL step=5m start="2023-01-06" end="2026-01-23" col0 = (sum(avg(rate(bytes_counter{request="/elasticsearch"}[5m]) ) ) )';

const withSources: Partial<ScenarioWorld> = {
  timeseriesIndices: [
    { name: 'metrics', mode: 'Timeseries', aliases: [] },
    { name: 'logs-tsdb', mode: 'Timeseries', aliases: [] },
  ],
};

const withControls: Partial<ScenarioWorld> = {
  supportsControls: true,
  variables: [
    { key: 'env', value: 'prod', type: ESQLVariableType.VALUES },
    { key: 'region', value: 'eu', type: ESQLVariableType.VALUES },
    { key: 'metricName', value: 'rate', type: ESQLVariableType.FUNCTIONS },
  ],
};

const nothingAfterIncompleteSelector: ScenarioExpectation = {
  excludes: [NEW_COLUMN, ...paramTexts],
  excludesLabels: [
    ...functionLabels,
    ...metricNames,
    ...labelNames,
    LABEL_SELECTOR_LABEL,
    RANGE_SELECTOR_LABEL,
    BY_LABEL,
    '|',
  ],
};

export const promqlScenarios: ScenarioTable = {
  command: 'promql',
  scenarios: [
    row(AFTER_KEYWORD, 'suggests all after PROMQL keyword without params', 'PROMQL ', {
      contains: [...paramTexts, NEW_COLUMN],
      containsLabels: functionLabels,
    }),
    row(AFTER_KEYWORD, 'suggests column when params are present', ALL_PARAMS, {
      contains: [NEW_COLUMN],
      containsLabels: functionLabels,
    }),
    row(
      AFTER_KEYWORD,
      'does not suggest column when cursor is before a param (editing middle of query)',
      `${ALL_PARAMS}rate(http_requests[5m])`,
      { excludes: [NEW_COLUMN] },
      { cursor: 'PROMQL index=metrics '.length }
    ),
    ...rows(
      AFTER_KEYWORD,
      'does not suggest already-used params',
      [
        'PROMQL index=metrics step=5m ',
        'PROMQL index = metrics step = 5m ',
        'PROMQL index="metrics" step="5m" ',
      ],
      { excludesLabels: ['index', 'step'], containsLabels: ['start', 'end'] }
    ),
    row(
      AFTER_KEYWORD,
      'does not suggest the used params or the ones they conflict with',
      ALL_PARAMS,
      {
        excludes: ['index = ', 'step = ', 'start = ', 'end = ', 'time = ', 'buckets = '],
        contains: ['scrape_interval = '],
      }
    ),
    row(
      AFTER_KEYWORD,
      'does not suggest params already present after the cursor',
      ALL_PARAMS,
      { excludesLabels: ['step', 'start', 'end'] },
      { cursor: 'PROMQL index=metrics '.length }
    ),
    row(AFTER_KEYWORD, 'does not suggest time when range params are used', 'PROMQL step=5m ', {
      excludes: ['time = '],
    }),
    row(
      AFTER_KEYWORD,
      'does not suggest range params when time is used',
      'PROMQL time="2026-01-13T11:30:00.000Z" ',
      { excludes: ['time = ', 'step = ', 'start = ', 'end = ', 'buckets = '] }
    ),
    row(
      AFTER_KEYWORD,
      'does not treat query tokens starting with param names as used params',
      'PROMQL start_time',
      { containsLabels: ['start'] },
      { cursor: 'PROMQL '.length }
    ),

    ...rows(
      PARAM_KEYWORD,
      'suggests = after a param keyword with space',
      paramNames.map((param) => `PROMQL ${param} `),
      { contains: [ASSIGN] }
    ),
    ...rows(
      PARAM_KEYWORD,
      'suggests = after a param keyword that follows a quoted value',
      [
        'PROMQL end="2026-01-13T11:30:00.000Z"start ',
        'PROMQL start="2024-01-01" step ',
        "PROMQL start='2024-01-01' step ",
      ],
      { contains: [ASSIGN] }
    ),

    ...rows(
      INSIDE_QUERY,
      'returns no param suggestions inside the query',
      [
        'PROMQL index=metrics (rate(',
        'PROMQL (metric{path="/api(v1)"}',
        'PROMQL (metric{job="api"} ',
      ],
      { excludes: paramTexts }
    ),
    row(INSIDE_QUERY, 'suggests promql functions inside query', 'PROMQL (', {
      containsLabels: functionLabels,
    }),
    ...rows(
      INSIDE_QUERY,
      'suggests selector after simple metric',
      ['PROMQL bytes ', 'PROMQL bytes_counter '],
      {
        containsLabels: [LABEL_SELECTOR_LABEL],
        excludesLabels: [RANGE_SELECTOR_LABEL],
        contains: [PIPE],
      }
    ),
    row(
      INSIDE_QUERY,
      'suggests query items inside empty parens',
      'PROMQL ()',
      { containsLabels: functionLabels, excludes: paramTexts },
      { cursor: 'PROMQL ('.length }
    ),
    row(
      INSIDE_QUERY,
      'returns no param suggestions when cursor is in middle of query',
      'PROMQL index=metrics (rate(http_requests[5m]))',
      { excludes: paramTexts },
      { cursor: after('PROMQL index=metrics (rate(http_requests[5m]))', 'rate(') }
    ),
    row(
      INSIDE_QUERY,
      'suggests after comma inside function args',
      'PROMQL index = kibana_sample_data_logstsdb step = "5m" round(bytes,  )',
      { contains: [SCALAR_PLACEHOLDER], excludesLabels: ['pi', 'time', 'abs', 'rate'] },
      {
        cursor: after(
          'PROMQL index = kibana_sample_data_logstsdb step = "5m" round(bytes,  )',
          ', '
        ),
      }
    ),
    row(INSIDE_QUERY, 'does not suggest after first arg without comma', 'PROMQL round(bytes ', {
      excludesLabels: [...functionLabels, ...metricNames],
    }),
    row(
      INSIDE_QUERY,
      'suggests only metrics after comma in range_vector arg',
      'PROMQL step = "5m" quantile_over_time(0, )',
      { containsLabels: metricNames, contains: metricTexts, excludesLabels: functionLabels },
      { cursor: after('PROMQL step = "5m" quantile_over_time(0, )', 'quantile_over_time(0, ') }
    ),
    row(
      INSIDE_QUERY,
      'suggests metrics after comma in wrapped parens query',
      'PROMQL step = "5m" (sum(avg(quantile_over_time(0,  ) ) ) )',
      { containsLabels: metricNames, contains: metricTexts, excludesLabels: functionLabels },
      {
        cursor: after(
          'PROMQL step = "5m" (sum(avg(quantile_over_time(0,  ) ) ) )',
          'quantile_over_time(0,  '
        ),
      }
    ),
    row(
      INSIDE_QUERY,
      'suggests scalar placeholder before comma in partially written first arg',
      'PROMQL step = "5m" sum(quantile_over_time(  , bytes_counter {event.dataset = "value"} [5m]) )',
      { contains: [SCALAR_PLACEHOLDER] },
      {
        cursor:
          'PROMQL step = "5m" sum(quantile_over_time(  , bytes_counter {event.dataset = "value"} [5m]) )'.indexOf(
            ', bytes_counter'
          ),
      }
    ),
    row(
      INSIDE_QUERY,
      'suggests range-vector metrics when cursor is before selector with missing metric',
      'PROMQL step = "5m" sum(quantile_over_time( 0 ,   {event.dataset =  "vue"}) )',
      { containsLabels: metricNames, excludesLabels: functionLabels },
      {
        cursor:
          'PROMQL step = "5m" sum(quantile_over_time( 0 ,   {event.dataset =  "vue"}) )'.indexOf(
            '{event.dataset'
          ),
      }
    ),
    row(
      INSIDE_QUERY,
      'does not leak grouping label suggestions inside function args when by clause exists later',
      'PROMQL step = "5m" sum(quantile_over_time( 0,  bytes {event.dataset =""} [5m]) ) by (event.dataset )',
      { containsLabels: metricNames, excludesLabels: ['event.dataset'] },
      {
        cursor:
          'PROMQL step = "5m" sum(quantile_over_time( 0,  bytes {event.dataset =""} [5m]) ) by (event.dataset )'.indexOf(
            'bytes'
          ),
      }
    ),
    row(
      INSIDE_QUERY,
      'suggests comma after complete first arg in multi-arg function',
      'PROMQL step = "5m" quantile(0.9 )',
      { containsLabels: [','], excludesLabels: functionLabels },
      { cursor: 'PROMQL step = "5m" quantile(0.9 )'.indexOf(')') }
    ),
    row(
      INSIDE_QUERY,
      'suggests comma after complete first arg in multi-arg function (no closing paren)',
      'PROMQL step = "5m" quantile(0.9 ',
      { containsLabels: [','], excludesLabels: functionLabels }
    ),
    row(
      INSIDE_QUERY,
      'does not suggest comma when cursor is at range selector boundary',
      NESTED_RANGE,
      { excludesLabels: [','] },
      { cursor: NESTED_RANGE.indexOf('[5m]') }
    ),
    row(
      INSIDE_QUERY,
      'suggests range selector before an existing range token after label selector',
      'PROMQL step = "5m" sum(quantile_over_time( 0, bytes  {event.dataset =""}  [5m]) )',
      { containsLabels: [RANGE_SELECTOR_LABEL], excludesLabels: [','] },
      {
        cursor:
          'PROMQL step = "5m" sum(quantile_over_time( 0, bytes  {event.dataset =""}  [5m]) )'.indexOf(
            '[5m]'
          ),
      }
    ),
    row(
      INSIDE_QUERY,
      'does not suggest comma when cursor is inside range selector',
      NESTED_RANGE,
      { excludesLabels: [','] },
      { cursor: NESTED_RANGE.indexOf('[5m]') + 2 }
    ),
    row(
      INSIDE_QUERY,
      'suggests range selector before closing paren after malformed label matcher',
      'PROMQL step = "5m" sum(avg(quantile_over_time( 0,  bytes_normal_counter   {event.dataset "value"} )     )  )',
      { containsLabels: [RANGE_SELECTOR_LABEL], excludesLabels: [','] },
      {
        cursor:
          'PROMQL step = "5m" sum(avg(quantile_over_time( 0,  bytes_normal_counter   {event.dataset "value"} )     )  )'.indexOf(
            ' )     )'
          ) + 1,
      }
    ),
    ...['api', 'job'].map((searchText) =>
      row(
        INSIDE_QUERY,
        'does not suggest function args when cursor is inside a label selector',
        'PROMQL rate(http_requests_total{job="api"}[5m])',
        { excludesLabels: [...functionLabels, ...metricNames] },
        { cursor: 'PROMQL rate(http_requests_total{job="api"}[5m])'.indexOf(searchText) + 1 }
      )
    ),
    row(INSIDE_QUERY, 'suggests numeric fields for rate()', 'PROMQL rate(', {
      containsLabels: metricNames,
      contains: metricTexts,
    }),
    row(
      INSIDE_QUERY,
      'suggests operators after complete expression inside aggregation',
      'PROMQL step="5m" sum(rate(doubleField[5m]) ',
      { containsLabels: operatorLabels }
    ),
    row(
      INSIDE_QUERY,
      'suggests operands (not operators) after binary operator inside aggregation',
      'PROMQL step="5m" sum(rate(doubleField[5m]) * ',
      { containsLabels: ['rate', 'sum', 'avg'], excludesLabels: operatorLabels }
    ),

    row(AGGREGATION, 'suggests by and wrapped arguments after aggregation name', 'PROMQL sum ', {
      contains: [BY, ...metricNames.map((name) => `(${name})`)],
      containsLabels: ['avg', 'rate'],
      excludesLabels: [LABEL_SELECTOR_LABEL],
      excludes: [PIPE],
    }),
    ...rows(
      AGGREGATION,
      'does not suggest selector after a function name without args',
      ['PROMQL sum ', 'PROMQL rate '],
      { excludesLabels: [LABEL_SELECTOR_LABEL] }
    ),
    row(
      AGGREGATION,
      'suggests expression items in second paren of pre-grouping form',
      'PROMQL sum by (keywordField) (',
      { containsLabels: ['abs', 'avg', ...metricNames], excludesLabels: [BY_LABEL] }
    ),
    row(
      AGGREGATION,
      'suggests by and pipe when cursor is at end of aggregation without space',
      'PROMQL sum(rate(http_requests_total[5m]))',
      { contains: [BY, PIPE] }
    ),
    row(
      AGGREGATION,
      'suggests by for incomplete query with column assignment',
      'PROMQL index=kibana_sample_data_logstsdb step=5m start="2026-01-06T15:30:00.000Z" end="2026-01-23T15:30:00.000Z" col= (sum(rate(bytes_counter[5m]))',
      { contains: [BY] }
    ),
    row(
      AGGREGATION,
      'suggests functions and metrics inside incomplete aggregation function',
      'PROMQL sum( ',
      { containsLabels: ['abs', 'avg', ...metricNames], excludesLabels: ['pi', 'time', BY_LABEL] }
    ),
    row(
      AGGREGATION,
      'suggests functions and metrics after opening paren in assignment',
      'PROMQL col0 = (',
      { containsLabels: ['abs', 'avg', ...metricNames], excludesLabels: [BY_LABEL] }
    ),
    row(
      AGGREGATION,
      'does not suggest by inside a complete empty function',
      'PROMQL sum()',
      { containsLabels: ['abs', 'avg', ...metricNames], excludesLabels: [BY_LABEL] },
      { cursor: 'PROMQL sum('.length }
    ),
    row(AGGREGATION, 'does not suggest by right after the opening paren', 'PROMQL sum(', {
      containsLabels: ['abs', 'avg', ...metricNames],
      excludesLabels: [BY_LABEL],
    }),
    row(
      AGGREGATION,
      'suggests labels inside by() grouping clause',
      'PROMQL sum(rate(http_requests[5m])) by (',
      { containsLabels: labelNames, excludesLabels: ['sum', 'rate', 'avg'] }
    ),
    row(
      AGGREGATION,
      'suggests comma after complete grouping label',
      'PROMQL sum(rate(http_requests[5m])) by (event.dataset ',
      { containsLabels: [','], excludesLabels: labelNames }
    ),
    row(
      AGGREGATION,
      'suggests labels after comma in grouping clause',
      'PROMQL sum(rate(http_requests[5m])) by (event.dataset, ',
      { containsLabels: labelNames, excludesLabels: functionLabels }
    ),
    row(
      AGGREGATION,
      'does not suggest comma inside an empty trailing grouping clause',
      'PROMQL step = "5m" sum(avg(quantile_over_time(0, bytes{event.dataset=""}[5m])) by (event.dataset)) by ()',
      { excludesLabels: [','] },
      {
        cursor:
          'PROMQL step = "5m" sum(avg(quantile_over_time(0, bytes{event.dataset=""}[5m])) by (event.dataset)) by ()'.lastIndexOf(
            ')'
          ),
      }
    ),
    ...rows(
      AGGREGATION,
      'does not suggest by after an aggregation that already has grouping',
      [
        'PROMQL sum(rate(http_requests[5m])) by (job) ',
        'PROMQL sum by (keywordField) (rate(doubleField[5m])) ',
      ],
      { excludes: [BY], contains: [PIPE] }
    ),
    row(
      AGGREGATION,
      'wrapped aggregation functions keep cursor inside parens (pre-grouped form)',
      'PROMQL sum by (keywordField) ',
      { contains: ['(avg $0) '] }
    ),
    row(
      AGGREGATION,
      'suggests by inside outer aggregation after trailing spaces',
      'PROMQL sum(avg(rate(bytes_counter))  )',
      { contains: [BY] },
      { cursor: 'PROMQL sum(avg(rate(bytes_counter))  )'.lastIndexOf(')') }
    ),
    row(
      AGGREGATION,
      'suggests by when cursor is in middle of trailing spaces',
      'PROMQL sum(avg(bytes_counter)    )',
      { contains: [BY] },
      { cursor: 'PROMQL sum(avg(bytes_counter)    )'.indexOf(')    )') + 3 }
    ),
    row(
      AGGREGATION,
      'suggests by for completed inner aggregation in incomplete outer query',
      'PROMQL sum(avg(bytes)',
      { containsLabels: [BY_LABEL] }
    ),
    row(AGGREGATION, 'does not suggest by after a simple rate()', 'PROMQL rate(bytes[5m]) ', {
      excludesLabels: [BY_LABEL],
    }),
    row(
      AGGREGATION,
      'does not suggest by after a nested rate() inside aggregation',
      'PROMQL sum(avg(rate(bytes_counter)   )  )',
      { excludesLabels: [BY_LABEL] },
      { cursor: after('PROMQL sum(avg(rate(bytes_counter)   )  )', 'bytes_counter)') + 1 }
    ),
    row(
      AGGREGATION,
      'does not suggest by after a rate() inside col0 assignment with labels',
      COMPLETE_ASSIGNMENT,
      { excludesLabels: [BY_LABEL] },
      { cursor: after(COMPLETE_ASSIGNMENT, '[5m])') + 1 }
    ),
    row(
      AGGREGATION,
      'does not suggest by at end of complete query with col0 = (...)',
      COMPLETE_ASSIGNMENT,
      { excludesLabels: [BY_LABEL], contains: [PIPE] }
    ),

    row(
      AFTER_PARAMS,
      'suggests remaining params and a new column after index param',
      'PROMQL index=metrics ',
      { contains: ['step = ', 'start = ', 'end = ', NEW_COLUMN], excludes: ['index = '] }
    ),
    row(
      AFTER_PARAMS,
      'suggests wrapped functions after custom column assignment',
      'PROMQL step=5m start=?_tstart end=?_tend col0 = ',
      { contains: wrappedFunctionTexts, excludes: paramTexts }
    ),

    row(
      AFTER_QUERY,
      'suggests pipe after complete query with by clause',
      'PROMQL index=metrics (sum by (instance) rate(http_requests_total[5m])) ',
      { contains: [PIPE] }
    ),
    ...rows(
      AFTER_QUERY,
      'suggests pipe and no params after a complete query',
      ['PROMQL (rate(http_requests[5m])) ', 'PROMQL rate(http_requests[5m]) '],
      { contains: [PIPE], excludesLabels: paramNames }
    ),
    row(
      AFTER_QUERY,
      'does not suggest params after custom column assignment',
      'PROMQL index=metrics col0=(rate(http_requests[5m])) ',
      { contains: [PIPE], excludesLabels: [...paramNames, ...functionLabels] }
    ),
    row(
      AFTER_QUERY,
      'suggests only pipe after complete query before pipe',
      'PROMQL step="5m" (sum(avg(rate(bytes_counter[5m])))) |',
      { contains: [PIPE], excludes: [BY] }
    ),
    row(
      AFTER_QUERY,
      'does not suggest pipe after param that looks like query (step=5m)',
      'PROMQL index=metrics step=5m ',
      { excludes: [PIPE, 'index = ', 'step = '], contains: ['start = ', 'end = '] }
    ),
    row(AFTER_QUERY, 'does not suggest pipe after multiple params (no query yet)', ALL_PARAMS, {
      excludes: [PIPE],
    }),
    row(
      AFTER_QUERY,
      'suggests RHS operand items after arithmetic operator at query boundary',
      'PROMQL step="5m" (sum(rate(doubleField[5m]))) + ',
      {
        containsLabels: ['abs', ...metricNames],
        contains: [SCALAR_PLACEHOLDER],
        excludes: [PIPE, BY],
      }
    ),
    ...rows(
      AFTER_QUERY,
      'suggests RHS operand items after an operator inside function args',
      [
        'PROMQL step="5m" quantile(0, doubleField{label!~"value"} * ',
        'PROMQL step="5m" quantile(0, doubleField - ',
      ],
      { containsLabels: metricNames, contains: [SCALAR_PLACEHOLDER] }
    ),
    row(
      AFTER_QUERY,
      'suggests label selector after metric name in RHS of operator',
      'PROMQL index=tsdb_index step="5m" sum(quantile(0.9, doubleField{label!~"value"} * doubleField ',
      { contains: [promqlLabelSelectorItem.text] }
    ),

    row(PARAM_VALUE, 'suggests durations for step=', 'PROMQL step=', { contains: stepValues }),
    row(
      PARAM_VALUE,
      'does not suggest step values when value already present',
      'PROMQL step =   5m',
      { excludes: stepValues },
      { cursor: 'PROMQL step =   '.length }
    ),
    ...rows(
      PARAM_VALUE,
      'suggests date literals for start= and time=',
      ['PROMQL start=', 'PROMQL time='],
      { contains: TIME_SYSTEM_PARAMS, excludesLabels: functionLabels }
    ),
    row(
      PARAM_VALUE,
      'suggests date literals when query follows end=',
      'PROMQL index = kibana_sample_data_logstsdb step = 1h start = "2026-01-08T16:00:00.000Z" end =  bytes_counter',
      { contains: TIME_SYSTEM_PARAMS },
      {
        cursor: after(
          'PROMQL index = kibana_sample_data_logstsdb step = 1h start = "2026-01-08T16:00:00.000Z" end =  bytes_counter',
          'end =  '
        ),
      }
    ),

    ...rows(
      INDEX,
      'suggests timeseries sources after index=, with any spacing',
      ['PROMQL index=', 'PROMQL index= ', 'PROMQL index = '],
      { containsLabels: ['metrics'] },
      { world: withSources }
    ),
    row(
      INDEX,
      'suggests comma and params after complete index name with space',
      'PROMQL index=metrics ',
      { containsLabels: [',', 'step', 'start', 'end'] },
      { world: withSources }
    ),
    row(
      INDEX,
      'suggests indices after comma',
      'PROMQL index=metrics, ',
      { containsLabels: ['logs-tsdb'] },
      { world: withSources }
    ),
    row(
      INDEX,
      'suggests indices when cursor is at index= with bare query after (no start/end)',
      'PROMQL step=5m index= avg(bytes_counter)',
      { containsLabels: ['metrics'] },
      { world: withSources, cursor: after('PROMQL step=5m index= avg(bytes_counter)', 'index=') }
    ),

    ...rows(
      LABEL_SELECTOR,
      'suggests labels after an opening brace or a comma in selector',
      ['PROMQL rate(http_requests{', 'PROMQL rate(http_requests{job="api", '],
      { containsLabels: labelNames, excludesLabels: functionLabels }
    ),
    row(
      LABEL_SELECTOR,
      'suggests labels when cursor is before a typed operator and label name is missing',
      'PROMQL step = "5m" sum(avg(quantile_over_time(0, bytes{ = ""}[5m])) by (event.dataset))',
      { containsLabels: labelNames },
      {
        cursor:
          'PROMQL step = "5m" sum(avg(quantile_over_time(0, bytes{ = ""}[5m])) by (event.dataset))'.indexOf(
            '{ = ""'
          ) + 2,
      }
    ),
    row(
      LABEL_SELECTOR,
      'does not suggest range selector when label map is incomplete',
      'PROMQL rate(http_requests{job="api"',
      { excludesLabels: [RANGE_SELECTOR_LABEL] }
    ),
    row(
      LABEL_SELECTOR,
      'suggests string placeholder when label value is missing',
      'PROMQL rate(bytes_counter{job= ',
      { contains: ['"${0:value}"'] }
    ),
    ...rows(
      LABEL_SELECTOR,
      'suggests create control and existing value variables after a label operator',
      [
        'PROMQL rate(bytes_counter{job= ',
        'PROMQL rate(bytes_counter{job!= ',
        'PROMQL rate(bytes_counter{job=~ ',
        'PROMQL rate(bytes_counter{job!~ ',
      ],
      { containsLabels: ['Create control', '?env', '?region'], excludesLabels: ['?metricName'] },
      { world: withControls }
    ),
    row(
      LABEL_SELECTOR,
      'suggests comma after complete label value',
      'PROMQL rate(http_requests{job="api" ',
      { containsLabels: [','], excludesLabels: labelNames }
    ),
    row(
      LABEL_SELECTOR,
      'suggests labels after complete label value',
      'PROMQL rate(http_requests{job="api",',
      { containsLabels: labelNames }
    ),
    row(
      LABEL_SELECTOR,
      'suggests selector items after metric name (range_vector function)',
      'PROMQL rate(bytes_counter',
      { containsLabels: [LABEL_SELECTOR_LABEL, RANGE_SELECTOR_LABEL] }
    ),
    row(
      LABEL_SELECTOR,
      'suggests only label selector after metric when range already exists (nested functions)',
      'PROMQL step="5m" sum(avg(rate(bytes_counter [5m])))',
      { containsLabels: [LABEL_SELECTOR_LABEL], excludesLabels: [RANGE_SELECTOR_LABEL] },
      { cursor: after('PROMQL step="5m" sum(avg(rate(bytes_counter [5m])))', 'bytes_counter ') }
    ),
    row(
      LABEL_SELECTOR,
      'suggests selector item after metric name (instant_vector function)',
      'PROMQL abs(bytes_counter',
      { containsLabels: [LABEL_SELECTOR_LABEL] }
    ),
    ...rows(
      LABEL_SELECTOR,
      'suggests only range selector after closed label selector, also with a pipe in the label value',
      ['PROMQL rate(http_requests{job="api"} ', 'PROMQL rate(bytes{event.dataset="|"} '],
      { containsLabels: [RANGE_SELECTOR_LABEL], excludesLabels: [LABEL_SELECTOR_LABEL] }
    ),
    row(
      LABEL_SELECTOR,
      'suggests range selector in nested function after label selector',
      'PROMQL sum(rate(bytes_counter { agent !=""}  ',
      { containsLabels: [RANGE_SELECTOR_LABEL] }
    ),
    ...rows(
      LABEL_SELECTOR,
      'does not suggest after an incomplete range or subquery selector',
      [
        'PROMQL rate(http_requests[',
        'PROMQL rate(http_requests[5m])[',
        'PROMQL rate(http_requests[5m])[30m:',
      ],
      nothingAfterIncompleteSelector
    ),

    row(
      CLASSIFIER,
      'suggests RHS operands after nested binary operator inside function args',
      'PROMQL step="5m" sum(rate(doubleField[5m]) * rate(doubleField[5m]) + ',
      {
        containsLabels: metricNames,
        contains: [SCALAR_PLACEHOLDER],
        excludesLabels: operatorLabels,
      }
    ),
    row(
      CLASSIFIER,
      'suggests no function or operator inside incomplete label map (no closing brace)',
      'PROMQL step="5m" rate(http_requests{job="api", ',
      { excludesLabels: [...functionLabels, ...operatorLabels] }
    ),
    row(CLASSIFIER, 'suggests functions and metrics at top level', 'PROMQL ', {
      containsLabels: [...functionLabels.slice(0, 3), ...metricNames.slice(0, 1)],
    }),
    row(
      CLASSIFIER,
      'suggests range and label selectors after a metric inside a range_vector function',
      'PROMQL step="5m" rate(bytes_counter ',
      { containsLabels: [RANGE_SELECTOR_LABEL, LABEL_SELECTOR_LABEL] }
    ),
    row(
      CLASSIFIER,
      'top-level metric suggests selector and operators',
      'PROMQL step="5m" bytes_counter ',
      {
        containsLabels: [...operatorLabels, LABEL_SELECTOR_LABEL],
        excludesLabels: [RANGE_SELECTOR_LABEL],
      }
    ),
  ],
};
