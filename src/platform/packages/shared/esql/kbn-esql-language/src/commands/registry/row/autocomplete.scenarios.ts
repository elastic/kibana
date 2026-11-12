/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functions } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ name, query, expect: { exact } }));

// The suggested name for the new column, followed by the assignment.
const newColumn = 'col0 = ';
const rowFunctions = functions({ availableIn: 'row', scalar: true });

export const rowScenarios: ScenarioTable = {
  command: 'row',
  scenarios: [
    ...rows(
      'suggests functions and an assignment for new expressions',
      ['ROW ', 'ROW foo = "bar", '],
      [newColumn, ...rowFunctions]
    ),
    ...rows('suggests only functions after an assignment', ['ROW col0 = '], rowFunctions),
    ...rows(
      'suggests a comma and a pipe after a complete expression',
      ['ROW col0 = 23 ', 'ROW ABS(23) ', 'ROW ABS(23), col0=234 '],
      [', ', '| ', '\n']
    ),
  ],
};
