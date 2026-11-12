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

const rows = (name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ name, query, expect: { exact } }));

const PATTERN = '"%{firstWord}" ';
const stringColumns = columns({ types: ['keyword', 'text'], followedBySpace: true });

export const dissectScenarios: ScenarioTable = {
  command: 'dissect',
  scenarios: [
    ...rows(
      'suggests fields after DISSECT',
      ['from a | DISSECT ', 'from a | DISSECT key'],
      stringColumns
    ),
    ...rows('suggests a pattern after a field name', ['from a | DISSECT keywordField '], [PATTERN]),
    ...rows(
      'suggests an append separator or pipe after a pattern',
      [`from a | DISSECT keywordField ${PATTERN} `],
      ['APPEND_SEPARATOR = ', '| ', '\n']
    ),
    ...rows(
      'suggests append separators',
      [`from a | DISSECT keywordField ${PATTERN} append_separator = `],
      ['":" ', '";" ']
    ),
    ...rows(
      'suggests a pipe after an append separator',
      [`from a | DISSECT keywordField ${PATTERN} append_separator = ":" `],
      ['| ', '\n']
    ),
  ],
};
