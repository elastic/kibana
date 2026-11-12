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

const existingColumns = columns({ followedBySpace: true });
// The suggested name for the new column, followed by the assignment.
const newColumn = 'col0 = ';

export const renameScenarios: ScenarioTable = {
  command: 'rename',
  scenarios: [
    ...rows(
      'suggests fields',
      [
        'from a | rename ',
        'from a | rename fie',
        'from a | rename field AS foo,',
        'from a | rename field = foo, ',
        'from a | rename field AS foo, fie',
        'from a | rename field = foo, fie',
      ],
      [newColumn, ...existingColumns]
    ),
    ...rows(
      'suggests AS after an existing field',
      [
        'from a | rename textField ',
        'from a | rename keywordField AS foo, textField ',
        'from a | rename keywordField as foo , textField ',
      ],
      ['AS ']
    ),
    ...rows(
      'suggests = after a field that does not exist',
      [
        'from a | rename field ',
        'from a | rename keywordField AS foo, field ',
        'from a | rename keywordField as foo , field ',
      ],
      ['= ']
    ),
    ...rows('suggests nothing after AS', ['from a | rename keywordField AS '], []),
    ...rows('suggests fields after =', ['from a | rename field = '], existingColumns),
    ...rows(
      'suggests pipe and comma after complete expression',
      ['from a | rename field AS foo '],
      ['| ', ', ', '\n']
    ),
  ],
};
