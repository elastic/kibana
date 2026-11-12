/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns, functions, operators } from '../../../__tests__/scenarios';
import type { ScenarioTable } from '../../../__tests__/scenarios';

const limitValues = ['10 ', '100 ', '1000 '];
const afterValue = ['BY ', '| ', '\n'];

const groupingExpression = [
  ...columns({ followedBySpace: true }),
  ...functions({ availableIn: 'limit_by', scalar: true, grouping: true }),
];

const afterGroupingColumn = [
  '| ',
  ', ',
  '\n',
  ...operators('comparison', 'arithmetic').filter((operator) => operator !== '-'),
];

export const limitScenarios: ScenarioTable = {
  command: 'limit',
  scenarios: [
    {
      group: 'LIMIT <number>',
      name: 'suggests numbers',
      query: 'from a | limit ',
      expect: { exact: limitValues },
    },
    {
      group: 'LIMIT <number>',
      name: 'suggests numbers when value is still missing',
      query: 'FROM kibana_sample_data_logs | LIMIT   ',
      expect: { exact: limitValues },
    },
    {
      group: 'LIMIT <number>',
      name: 'suggests BY and pipe after number',
      query: 'from a | limit 4 ',
      expect: { exact: afterValue },
    },
    {
      group: 'LIMIT <number> BY',
      name: 'suggests columns and functions after BY',
      query: 'from a | limit 10 by ',
      expect: { exact: groupingExpression },
    },
    {
      group: 'LIMIT <number> BY',
      name: 'suggests columns and functions after uppercase BY',
      query: 'from a | limit 10 BY ',
      expect: { exact: groupingExpression },
    },
    {
      group: 'LIMIT <number> BY',
      name: 'suggests pipe and comma after complete column',
      query: 'from a | limit 10 by integerField ',
      expect: { exact: afterGroupingColumn },
    },
    {
      group: 'LIMIT <number> BY',
      name: 'suggests columns after comma',
      query: 'from a | limit 10 by integerField, ',
      expect: { exact: groupingExpression.filter((text) => text !== 'integerField ') },
    },
    {
      group: 'LIMIT <param>',
      name: 'suggests BY and pipe after parameter',
      query: 'from a | limit ?rows ',
      expect: { exact: afterValue },
    },
  ],
};
