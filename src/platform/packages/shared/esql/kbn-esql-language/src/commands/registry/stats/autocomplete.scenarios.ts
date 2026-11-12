/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  columns,
  counterRateTestFunction,
  functions,
  operators,
  timeSpans,
} from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (group: string, name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const AGGREGATES = '... <aggregates> ...';
const WHERE = '... WHERE expression ...';
const BY = '... BY <grouping>';
const HISTOGRAM = 'date histogram snippet';
const BY_COLUMNS = 'columns defined in the BY clause';

const COMMON_NUMERIC_TYPES = ['double', 'long', 'integer'] as const;
const ROUND_PARAMETER_TYPES = ['double', 'integer', 'long', 'unsigned_long'] as const;
const AVG_TYPES = [
  'double',
  'integer',
  'long',
  'aggregate_metric_double',
  'exponential_histogram',
  'tdigest',
] as const;
const COUNTER_TYPES = ['counter_double', 'counter_integer', 'counter_long'] as const;
const BUCKET_FIELD_TYPES = [...COMMON_NUMERIC_TYPES, 'date', 'date_nanos'] as const;
const BUCKET_FUNCTION_TYPES = [
  'date',
  'date_nanos',
  ...COMMON_NUMERIC_TYPES,
  'exponential_histogram',
  'tdigest',
] as const;
const MIN_FIELD_TYPES = [
  ...COMMON_NUMERIC_TYPES,
  'date',
  'date_nanos',
  'boolean',
  'ip',
  'version',
  'text',
  'keyword',
] as const;
const MIN_FUNCTION_TYPES = [
  ...MIN_FIELD_TYPES,
  'unsigned_long',
  'aggregate_metric_double',
  'exponential_histogram',
  'tdigest',
] as const;

const NUMBER_PLACEHOLDER = '${0:0}';
const DATE_HISTOGRAM = 'BUCKET($0, 50, ?_tstart, ?_tend)';
const TIMESERIES_DATE_HISTOGRAM = 'TBUCKET(50)';
const DATE_HISTOGRAM_LABEL = 'Add date histogram';

// The suggested name for the new column, followed by the assignment.
const newColumn = 'col0 = ';
// The name suggested when `col0` and `col1` are taken.
const thirdNewColumn = 'col2 = ';

const aggregations = functions({ availableIn: 'stats', aggregation: true });
const scalarFunctions = functions({ availableIn: 'stats', scalar: true });
const groupingFunctions = functions({ availableIn: 'stats', grouping: true });
const aggregateFunctions = [...aggregations, ...groupingFunctions, ...scalarFunctions];

const firstEmptyExpression = ['BY ', newColumn, ...aggregateFunctions];
const emptyExpression = [newColumn, ...aggregateFunctions];
const emptyGrouping = [
  newColumn,
  DATE_HISTOGRAM,
  ...columns(),
  ...scalarFunctions,
  ...groupingFunctions,
];

const subqueryOpeners = ['($0)', '(FROM $0)', '(ROW $0)', '(TS $0)'];
const negatableOperators = operators('patternMatch', 'in').filter(
  (operator) => !operator.startsWith('NOT ')
);

const operatorsAccepting = (
  availableIn: 'stats' | 'stats_by',
  type: 'double' | 'integer' | 'keyword' | 'date'
): string[] =>
  functions({ availableIn, operators: true, withoutAssignment: true, accepting: [type] });

const afterAggregate = (type: 'double' | 'integer'): string[] => [
  '\n',
  'WHERE ',
  'BY ',
  ', ',
  '| ',
  ...operatorsAccepting('stats', type),
];

const afterGrouping = (type: 'double' | 'integer' | 'keyword' | 'date'): string[] => [
  '\n',
  ', ',
  '| ',
  ...operatorsAccepting('stats_by', type),
];

const completeColumn = ['\n', 'integerField | ', 'integerField, '];

const roundArgument = [
  ...columns({ types: ROUND_PARAMETER_TYPES }),
  ...functions({
    availableIn: 'stats_by',
    returning: ROUND_PARAMETER_TYPES,
    scalar: true,
    grouping: true,
    except: ['round'],
  }),
];

const roundArgumentWithAggregations = [
  ...functions({ availableIn: 'stats', returning: ROUND_PARAMETER_TYPES, aggregation: true }),
  ...roundArgument,
];

const avgArgument = [
  ...columns({ types: AVG_TYPES }),
  ...functions({ availableIn: 'stats_by', returning: AVG_TYPES, scalar: true, grouping: true }),
];

const timeseriesAvgFunctions = functions({
  availableIn: ['stats', 'stats_timeseries'],
  returning: AVG_TYPES,
  scalar: true,
  timeseriesAggregation: true,
});

const minArgument = [
  ...columns({ types: MIN_FIELD_TYPES }),
  ...functions({
    availableIn: 'stats',
    returning: MIN_FUNCTION_TYPES,
    scalar: true,
    grouping: true,
  }),
];

const bucketFieldArgument = [
  ...columns({ types: BUCKET_FIELD_TYPES }),
  ...functions({ availableIn: 'eval', returning: BUCKET_FUNCTION_TYPES, scalar: true }),
];

export const statsScenarios: ScenarioTable = {
  command: 'stats',
  scenarios: [
    ...rows(
      AGGREGATES,
      'suggestions for a fresh expression',
      ['from a | stats ', 'FROM a | STATS '],
      firstEmptyExpression
    ),
    ...rows(
      AGGREGATES,
      'suggestions for the next expression',
      ['from a | stats a=max(b), ', 'from a | stats a=max(b) WHERE doubleField > longField, '],
      emptyExpression
    ),
    ...rows(
      AGGREGATES,
      'on assignment expression, shows all agg and eval functions',
      ['from a | stats a= '],
      aggregateFunctions
    ),
    ...rows(
      AGGREGATES,
      'on space after aggregate field',
      ['from a | stats a=min(integerField) '],
      afterAggregate('integer')
    ),
    ...rows(
      AGGREGATES,
      'while typing a keyword after an aggregate',
      ['FROM index1 | STATS AVG(doubleField) WHE', 'FROM index1 | STATS AVG(doubleField) B'],
      afterAggregate('double')
    ),
    ...rows(
      AGGREGATES,
      'suggests counter fields for an aggregate in a TS pipeline',
      ['TS a | stats avg('],
      [...columns({ types: [...AVG_TYPES, ...COUNTER_TYPES] }), ...timeseriesAvgFunctions]
    ),
    ...rows(
      AGGREGATES,
      'does not suggest counter fields for an aggregate in a FROM pipeline',
      ['from a | stats avg('],
      avgArgument
    ),
    ...rows(
      AGGREGATES,
      'leaves the enclosing function out of an aggregate argument',
      ['from a | stats round(avg('],
      avgArgument.filter((text) => text !== 'ROUND($0)')
    ),
    {
      group: AGGREGATES,
      name: 'suggests time series aggregations in a TS pipeline',
      query: 'TS a | stats avg(',
      testFunctions: [counterRateTestFunction],
      expect: { contains: ['FUNC($0)'] },
    },
    ...rows(
      AGGREGATES,
      'treats a bare counter aggregate as complete in a TS pipeline',
      ['TS a | stats avg(counterIntegerField) '],
      afterAggregate('double')
    ),
    ...rows(
      AGGREGATES,
      'suggests nothing after a bare counter aggregate in a FROM pipeline',
      ['from a | stats avg(counterIntegerField) '],
      []
    ),
    ...rows(
      AGGREGATES,
      'adds a comma to columns and functions in the first argument of BUCKET',
      ['from a | stats by bucket('],
      [
        ...columns({ types: BUCKET_FIELD_TYPES }).map((text) => `${text}, `),
        ...functions({
          availableIn: 'stats_by',
          returning: BUCKET_FUNCTION_TYPES,
          scalar: true,
        }).map((text) => `${text},`),
      ]
    ),
    ...rows(
      AGGREGATES,
      'on function left paren, with aggregations',
      ['from a | stats round(', 'from a | stats round(round('],
      roundArgumentWithAggregations
    ),
    ...rows(
      AGGREGATES,
      'on function left paren inside an aggregation',
      ['from a | stats avg(round('],
      roundArgument
    ),
    ...rows(
      AGGREGATES,
      'when typing inside function left paren',
      ['from a | stats a=min(', 'from a | stats a=min(b), b=max('],
      minArgument
    ),
    {
      group: AGGREGATES,
      name: 'when typing inside the first of two functions',
      query: 'from a | stats a=min(',
      after: 'b), b=max(',
      expect: { exact: minArgument },
    },
    ...rows(
      AGGREGATES,
      'suggests only aggregations inside an argument that takes an aggregation',
      ['from a | stats SPARKLINE('],
      functions({
        availableIn: 'stats',
        returning: ['integer', 'long', 'double'],
        aggregation: true,
        timeseriesAggregation: true,
        except: ['sparkline'],
      }).map((text) => `${text},`)
    ),
    {
      group: AGGREGATES,
      name: 'inside function argument list',
      query: 'from a | stats avg(b',
      after: ') by stringField',
      expect: {
        exact: [
          ...columns({ types: AVG_TYPES }),
          ...functions({
            availableIn: 'stats_by',
            returning: AVG_TYPES,
            scalar: true,
            grouping: true,
          }),
        ],
      },
    },
    {
      group: AGGREGATES,
      name: 'when typing right paren',
      query: 'from a | stats a = min(integerField)',
      after: ' | sort b',
      expect: { exact: afterAggregate('integer') },
    },
    ...rows(
      AGGREGATES,
      'increments suggested variable name counter',
      ['from a | eval col0=round(b), col1=round(c) | stats '],
      ['BY ', thirdNewColumn, ...aggregateFunctions]
    ),
    ...rows(
      AGGREGATES,
      'increments suggested variable name counter after a comma',
      ['from a | stats col0=min(b),col1=c,'],
      [thirdNewColumn, ...aggregateFunctions]
    ),
    ...rows(
      AGGREGATES,
      'expressions with aggregates',
      ['from a | stats col0 = min(integerField) '],
      afterAggregate('integer')
    ),
    ...rows(
      AGGREGATES,
      'after an arithmetic operator following an aggregate',
      ['from a | stats col0 = min(integerField) + '],
      functions({
        availableIn: 'stats',
        returning: ['integer', 'double', 'long', 'dense_vector'],
        scalar: true,
        aggregation: true,
        grouping: true,
      })
    ),
    ...rows(
      WHERE,
      'suggests fields and functions in empty expression',
      ['FROM a | STATS MIN(b) WHERE '],
      [
        ...columns({ followedBySpace: true }),
        ...functions({ availableIn: 'stats_where', scalar: true }),
      ]
    ),
    ...rows(
      WHERE,
      'suggests operators after a first operand',
      ['FROM a | STATS MIN(b) WHERE keywordField '],
      operators('comparison', 'match', 'patternMatch', 'in', 'nullCheck')
    ),
    ...rows(
      WHERE,
      'suggests after operator',
      ['FROM a | STATS MIN(b) WHERE keywordField != '],
      [
        ...columns({ types: ['text', 'keyword'] }),
        ...functions({
          availableIn: 'stats_where',
          returning: ['text', 'keyword'],
          scalar: true,
        }),
      ]
    ),
    ...rows(
      WHERE,
      'suggests opening a list or subquery after IN in WHERE',
      [
        'FROM a | STATS MIN(b) WHERE keywordField IN ',
        'FROM a | STATS MIN(b) WHERE keywordField NOT IN ',
      ],
      subqueryOpeners
    ),
    ...rows(
      WHERE,
      'does not suggest subqueries after IN outside WHERE',
      [
        'FROM a | STATS MIN(b) BY keywordField IN ',
        'FROM a | STATS MIN(b) BY keywordField NOT IN ',
      ],
      ['($0)']
    ),
    ...rows(
      WHERE,
      'suggests LIKE pattern values after LIKE in WHERE',
      ['FROM a | STATS MIN(b) WHERE keywordField LIKE '],
      ['"${0:*}"', '"${0:?}"']
    ),
    {
      group: WHERE,
      name: 'suggests pipe, comma and BY after complete boolean expression',
      query: 'FROM a | STATS MIN(b) WHERE keywordField != keywordField ',
      expect: { contains: ['| ', ', ', 'BY '] },
    },
    {
      group: WHERE,
      name: 'does not suggest pipe, comma and BY after complete non-boolean',
      query: 'FROM a | STATS MIN(b) WHERE longField + 1 ',
      expect: { excludes: ['| ', ', ', 'BY '] },
    },
    ...rows(
      WHERE,
      'suggests after logical operator',
      ['FROM a | STATS AVG(doubleField) WHERE keywordField >= keywordField AND doubleField '],
      functions({
        availableIn: 'stats_where',
        returning: 'boolean',
        operators: true,
        accepting: ['double'],
      })
    ),
    ...rows(
      BY,
      'on space after "BY" keyword',
      [
        'from a | stats a=max(b) by ',
        'from a | stats a=max(b) BY ',
        'from a | stats a=min(b) by ',
        'from a | stats a=max(b) BY keywor',
        'from a | stats a=c by d, ',
        'from a | stats avg(b) by c, ',
        'FROM a | STATS BY col = BUCKET(@timestamp, 50, ?_tstart, ?_tend), ',
      ],
      emptyGrouping
    ),
    ...rows(
      BY,
      'on partial column name after a grouping column',
      ['from a | stats a=max(b) BY integerField, keywor'],
      emptyGrouping.filter((text) => text !== 'integerField')
    ),
    ...rows(
      BY,
      'on complete column name',
      [
        'from a | stats a=max(b) by integerField',
        'from a | stats a=max(b) by col0 = integerField',
        'from a | stats a=max(b) by keywordField, integerField',
        'from a | stats a=max(b) by keywordField, col0 = integerField',
      ],
      completeColumn
    ),
    {
      group: BY,
      name: 'attaches field range',
      query: 'from a | stats a=max(b) by integerF',
      expect: { contains: [{ text: 'integerField', rangeToReplace: { start: 27, end: 35 } }] },
    },
    ...rows(
      BY,
      'on space after grouping field',
      ['from a | stats a=c by keywordField ', 'from a | stats a=c by CATEGORIZE(keywordField) '],
      afterGrouping('keyword')
    ),
    ...rows(BY, 'after comma in the aggregates', ['from a | stats a=min(b),'], emptyExpression),
    ...rows(
      BY,
      'on space before expression right hand side operand',
      ['from a | stats avg(b) by integerField % '],
      [
        ...columns({ types: ['integer', 'double', 'long'] }),
        ...functions({
          availableIn: 'eval',
          returning: ['integer', 'double', 'long'],
          scalar: true,
        }),
        // The grouping functions that cannot be an operand are left out.
        ...groupingFunctions.filter(
          (text) => !['CATEGORIZE', 'TBUCKET', 'WITHOUT'].some((name) => text.includes(name))
        ),
      ]
    ),
    ...rows(
      BY,
      'after an assignment in the grouping',
      ['from a | stats avg(b) by col0 = ', 'from a | stats avg(b) by c, col0 = '],
      emptyGrouping.filter((text) => text !== newColumn)
    ),
    ...rows(
      BY,
      'on space after expression right hand side operand',
      ['from a | stats avg(b) by doubleField % 2 '],
      afterGrouping('double')
    ),
    ...rows(
      BY,
      'on space after a parenthesized grouping',
      ['from a | stats avg(doubleField) by (integerField) '],
      afterGrouping('integer')
    ),
    ...rows(
      BY,
      'on space after a named BUCKET',
      ['from a | stats col0 = AVG(doubleField) BY col1 = BUCKET(dateField, 1 day) '],
      afterGrouping('date')
    ),
    ...rows(
      BY,
      'after NOT keyword',
      ['FROM logs-apache_error | STATS count() by keywordField <= textField NOT '],
      negatableOperators
    ),
    {
      group: BY,
      name: 'within bucket(), at the empty first argument',
      query: 'FROM a | STATS COUNT() BY BUCKET(',
      after: ', 50, ?_tstart, ?_tend)',
      expect: { exact: bucketFieldArgument },
    },
    {
      group: BY,
      name: 'within bucket(), at the first argument before a space',
      query: 'FROM a | STATS COUNT() BY BUCKET(',
      after: ' , 50, ?_tstart, ?_tend)',
      expect: { exact: bucketFieldArgument },
    },
    {
      group: BY,
      // The second parameter takes constants only: a number of buckets or a time span.
      name: 'within bucket(), at the second argument',
      query: 'from a | stats avg(b) by BUCKET(dateField, ',
      after: '50, ?_tstart, ?_tend)',
      expect: { exact: [...timeSpans(), NUMBER_PLACEHOLDER] },
    },
    {
      group: HISTOGRAM,
      name: 'uses histogramBarTarget preference when available',
      query: 'FROM a | STATS BY ',
      expect: {
        contains: [{ text: DATE_HISTOGRAM, label: DATE_HISTOGRAM_LABEL, asSnippet: true }],
      },
    },
    {
      group: HISTOGRAM,
      name: 'suggests TBUCKET for TS source command',
      query: 'TS a | STATS BY ',
      expect: {
        contains: [{ text: TIMESERIES_DATE_HISTOGRAM, label: DATE_HISTOGRAM_LABEL }],
        excludes: [DATE_HISTOGRAM],
      },
    },
    {
      group: HISTOGRAM,
      name: 'BUCKET constant arguments should not trigger function suggestions',
      query: 'FROM a | STATS BY BUCKET(dateField, 50, ',
      expect: { excludesLabels: [DATE_HISTOGRAM_LABEL], uniqueLabels: true },
    },
    {
      group: HISTOGRAM,
      name: 'BUCKET with numeric field should NOT show col0 or date histogram at second param',
      query: 'FROM a | STATS AVG(b) BY BUCKET(numberField, ',
      expect: {
        excludesLabels: [
          'col0',
          DATE_HISTOGRAM_LABEL,
          '?_tstart',
          '?_tend',
          'numberField',
          'dateField',
        ],
      },
    },
    {
      group: HISTOGRAM,
      name: 'BUCKET(@timestamp, 1 day should NOT suggest comma (2-param signature complete)',
      query: 'FROM a | STATS BY BUCKET(dateField, 1 day ',
      expect: { excludesLabels: [','] },
    },
    {
      group: BY_COLUMNS,
      name: 'suggests a BY-defined column inside an aggregation function argument',
      query: 'FROM a | STATS AVG(',
      after: ') BY abc = doubleField',
      expect: { containsLabels: ['abc'] },
    },
    {
      group: BY_COLUMNS,
      name: 'suggests a BY-defined column inside an unclosed aggregation function argument',
      query: 'FROM a | STATS AVG(',
      after: ' BY abc = doubleField',
      expect: { containsLabels: ['abc'] },
    },
    {
      group: BY_COLUMNS,
      name: 'suggests a BY-defined column in the per-aggregation WHERE clause',
      query: 'FROM a | STATS COUNT() WHERE ',
      after: 'BY abc = keywordField',
      expect: { containsLabels: ['abc'] },
    },
    {
      group: BY_COLUMNS,
      name: 'suggests an implicit BY expression from an empty WHERE clause',
      query: 'FROM a | STATS COUNT() WHERE ',
      after: ' BY BUCKET(doubleField, 10)',
      expect: { containsLabels: ['BUCKET(doubleField, 10)'] },
    },
    {
      group: BY_COLUMNS,
      name: 'does not suggest a BY-defined column within the BY clause itself',
      query: 'FROM a | STATS COUNT() BY abc = keywordField, def = ',
      expect: { excludesLabels: ['abc'] },
    },
    {
      group: BY_COLUMNS,
      name: 'does not suggest an input field shadowed by a BY column of a different type',
      query: 'FROM a | STATS AVG(',
      after: ') BY doubleField = keywordField',
      expect: { excludesLabels: ['doubleField'] },
    },
    {
      group: BY_COLUMNS,
      name: 'does not leak a BY column from a sibling STATS command',
      query: 'FROM a | STATS count = COUNT() WHERE ',
      after: ' | STATS SUM(count) BY bucket = keywordField',
      expect: { excludesLabels: ['bucket'] },
    },
  ],
};
