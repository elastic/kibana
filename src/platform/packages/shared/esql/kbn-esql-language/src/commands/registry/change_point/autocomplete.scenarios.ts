/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns, functions } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (name: string, queries: string[], exact: string[], group?: string): Scenario[] =>
  queries.map((query) => ({ group, name, query, expect: { exact } }));

const AS = 'AS';
const BY = 'BY';

const allColumns = columns({ followedBySpace: true });
const groupingFunctions = functions({
  availableIn: 'change_point_by',
  scalar: true,
  grouping: true,
});

export const changePointScenarios: ScenarioTable = {
  command: 'change_point',
  scenarios: [
    ...rows(
      'suggests value columns of numeric types',
      ['from a | change_point '],
      columns({
        types: ['integer', 'long', 'double', 'unsigned_long', 'counter_integer'],
        followedBySpace: true,
      })
    ),
    ...rows(
      'suggests ON after value column',
      ['from a | change_point value '],
      ['\n', 'ON ', 'AS ', 'BY ', '| ']
    ),
    ...rows(
      'suggests fields after ON',
      ['from a | change_point value on ', 'from a | change_point value on fi'],
      allColumns
    ),

    ...rows(
      'suggests AS after ON <field>',
      ['from a | change_point value on field '],
      ['\n', 'AS ', 'BY ', '| '],
      AS
    ),
    ...rows(
      'suggests default field name for AS clauses',
      ['from a | change_point value as ', 'from a | change_point value on field as '],
      ['changePointType, '],
      AS
    ),
    ...rows(
      'suggests a default pValue column name',
      [
        'from a | change_point value on field as changePointType,',
        'from a | change_point value on field as changePointType,pValu',
      ],
      ['pValue'],
      AS
    ),
    ...rows(
      'suggests BY and pipe after the AS clause, with or without an ON clause',
      [
        'from a | change_point value on field as changePointType, pValue ',
        'from a | change_point value as changePointType, pValue ',
      ],
      ['\n', 'BY ', '| '],
      AS
    ),

    ...rows(
      'suggests fields and functions after BY',
      [
        'from a | change_point value by ',
        'from a | change_point value on field as changePointType, pValue by ',
      ],
      [...allColumns, ...groupingFunctions],
      BY
    ),
    ...rows(
      'suggests the fields that are not listed yet and functions after BY <field>,',
      ['from a | change_point value by keywordField, '],
      [...allColumns.filter((text) => text !== 'keywordField '), ...groupingFunctions],
      BY
    ),
    ...rows(
      'suggests comma and pipe after a complete grouping field',
      ['from a | change_point value by keywordField '],
      ['\n', ', ', '| '],
      BY
    ),
  ],
};
