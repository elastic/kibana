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

const rows = (name: string, queries: string[], exact: string[], group?: string): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const MODES = ['any', 'coordinator', 'remote'];
const POLICIES = ['policy ', '`policy$` '];
const ENRICH_FIELDS = ['otherField', 'yetAnotherField'];
const END_OF_CLAUSE = ['\n', ',', '| '];

export const enrichScenarios: ScenarioTable = {
  command: 'enrich',
  scenarios: [
    ...rows('suggests policy names', ['from a | enrich ', 'from a | enrich po'], POLICIES),
    ...rows(
      'suggests modes',
      ['from a | enrich _'],
      MODES.map((mode) => `_${mode}:$0`)
    ),
    ...rows('suggests nothing after a mode and a space', ['from a | enrich _any: '], []),
    ...rows(
      'suggests policy names after a mode, in any case',
      MODES.flatMap((mode) => [
        `from a | enrich _${mode}:`,
        `from a | enrich _${mode.toUpperCase()}:`,
      ]),
      POLICIES
    ),
    ...rows(
      'suggests ON and WITH after policy name',
      ['from a | enrich policy ', 'from a | enrich policy O'],
      ['\n', 'ON ', 'WITH ', '| ']
    ),
    ...rows(
      'suggests fields after ON',
      ['from a | enrich policy on ', 'from a | enrich policy on fi'],
      columns({ followedBySpace: true })
    ),

    ...rows(
      'suggests WITH after ON <field>',
      ['from a | enrich policy on field '],
      ['\n', 'WITH ', '| '],
      'WITH'
    ),
    ...rows(
      'suggests fields for new WITH clauses',
      ['from a | enrich policy on field with ', 'from a | enrich policy on field with fi'],
      ['col0 = ', ...ENRICH_FIELDS],
      'WITH'
    ),
    ...rows(
      'suggests fields for a second WITH clause',
      [
        'from a | enrich policy on b with col0 = otherField, ',
        'from a | enrich policy on b with col0 = otherField, fi',
      ],
      ['col1 = ', ...ENRICH_FIELDS],
      'WITH'
    ),
    ...rows(
      'waits to suggest fields until space',
      ['from a | enrich policy on b with col0 = otherField,', 'from a | enrich policy on b with'],
      [],
      'WITH'
    ),
    ...rows(
      'suggests the assignment after a name that is not an enrich field',
      ['from a | enrich policy on b with col0 '],
      ['= $0'],
      'WITH'
    ),
    ...rows(
      'suggests the end of the clause after an enrich field',
      ['from a | enrich policy on b with otherField '],
      END_OF_CLAUSE,
      'WITH'
    ),
    ...rows(
      'suggests enrich fields after open assignment',
      [
        'from a | enrich policy on b with col0 = ',
        'from a | enrich policy on b with col0 = fi',
        'from a | enrich policy on b with col0 = otherField, col1 =  ',
      ],
      ENRICH_FIELDS,
      'WITH'
    ),
    ...rows(
      'suggests the end of the clause after a complete clause',
      [
        'from a | enrich policy on b with col0 = `otherField` ',
        'from a | enrich policy on b with col0=otherField ',
      ],
      END_OF_CLAUSE,
      'WITH'
    ),
    ...rows(
      'suggests the assignment after a second new column name',
      ['from a | enrich policy on b with col0 = otherField, col1 '],
      ['= $0'],
      'WITH'
    ),
  ],
};
