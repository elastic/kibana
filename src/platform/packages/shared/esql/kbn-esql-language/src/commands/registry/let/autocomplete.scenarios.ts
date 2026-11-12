/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ name, query, expect: { exact } }));

const SUBQUERIES = ['(FROM $0);', '(ROW $0);', '(TS $0);'];

export const letScenarios: ScenarioTable = {
  command: 'let',
  scenarios: [
    ...rows(
      'suggests the assignment after the binding name',
      ['LET selected ', 'let\tselected\n'],
      ['= ']
    ),
    ...rows(
      'suggests subqueries after the assignment',
      ['LET selected = ', 'LET selected ='],
      SUBQUERIES
    ),
    ...rows(
      'suggests a semicolon after the subquery',
      ['LET selected = (FROM index)', 'LET selected = (FROM index) '],
      [';\n']
    ),
    {
      name: 'does not suggest a semicolon when one already follows the cursor',
      query: 'LET selected = (FROM index)',
      after: ' ;',
      expect: { exact: [] },
    },
  ],
};
