/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { DEFAULT_WORLD, functions } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable, ScenarioWorld } from '../../../__tests__/scenarios';

const denseField: ESQLFieldWithMetadata = {
  name: 'denseField',
  type: 'dense_vector',
  userDefined: false,
};

const withDenseVector: Partial<ScenarioWorld> = {
  columns: [...DEFAULT_WORLD.columns, denseField],
};

const rows = (name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ name, query, world: withDenseVector, expect: { exact } }));

const QUERY_VECTOR = '[${0:0.1}, ${1:0.2}]::dense_vector ';

export const mmrScenarios: ScenarioTable = {
  command: 'mmr',
  scenarios: [
    ...rows(
      'suggests query vector, dense-vector functions and ON after MMR keyword',
      ['FROM a | MMR '],
      [
        QUERY_VECTOR,
        'ON ',
        ...functions({ availableIn: 'mmr', returning: 'dense_vector', scalar: true }),
      ]
    ),
    ...rows('suggests ON after query vector', ['FROM a | MMR [0.1, 0.2]::dense_vector '], ['ON ']),
    ...rows(
      'suggests only dense vector fields after ON',
      ['FROM a | MMR ON ', 'FROM a | MMR [0.1, 0.2]::dense_vector ON '],
      ['denseField ']
    ),
    {
      name: 'suggests nothing after ON when there is no dense vector field',
      query: 'FROM a | MMR ON ',
      expect: { exact: [] },
    },
    {
      name: 'does not suggest ON while cursor is inside query vector function arguments',
      query: 'FROM a | MMR TO_DENSE_VECTOR(',
      world: withDenseVector,
      expect: { contains: ['keywordField'], excludes: ['ON '] },
    },
    ...rows('suggests LIMIT after field', ['FROM a | MMR ON denseField '], ['LIMIT ']),
    ...rows(
      'suggests limit value after LIMIT keyword',
      ['FROM a | MMR ON denseField LIMIT '],
      ['10 ', '100 ', '1000 ']
    ),
    ...rows(
      'suggests WITH and pipe after limit value',
      ['FROM a | MMR ON denseField LIMIT 10 '],
      ['\n', 'WITH { $0 }', '| ']
    ),
    ...rows(
      'suggests lambda map after WITH keyword',
      ['FROM a | MMR ON denseField LIMIT 10 WITH '],
      ['{ "lambda": ${0:0.5} }']
    ),
    ...rows(
      'suggests lambda key inside options map',
      ['FROM a | MMR ON denseField LIMIT 10 WITH { '],
      ['"lambda": ']
    ),
  ],
};
