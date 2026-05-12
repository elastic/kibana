/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSuggestionsForHint } from '../../../commands/definitions/utils/autocomplete/parameters_from_hints.test';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { setup } from './helpers';
import { getAllFunctions } from '../../../commands/definitions/utils/functions';
import { uniqBy } from 'lodash';
import { setTestFunctions } from '../../../commands/definitions/utils/test_functions';
import { FunctionDefinitionTypes } from '../../../commands';
import { Location } from '../../../commands/registry/types';

const allHints = getAllFunctions()
  .flatMap((fn) => fn.signatures)
  .flatMap((signature) => signature.params)
  .flatMap((param) => (param.hint ? [param.hint] : []));

const entityTypeHints = uniqBy(
  allHints.filter((hint) => hint.entityType !== undefined),
  'entityType'
);

describe('function parameters autocomplete from hints', () => {
  const callbacks: ESQLCallbacks = {
    getInferenceEndpoints: async (taskType) => {
      return {
        inferenceEndpoints: [
          { inference_id: 'inference_endpoint_1', task_type: taskType ?? 'text_embedding' },
        ],
      };
    },
  };

  afterEach(() => setTestFunctions([]));

  it.each(entityTypeHints)('should resolve suggestions for $entityType', async (hint) => {
    const functionName = `test_hint_${hint.entityType}`;

    // Define a fake function to test the parameter hint
    // (real functions can have the hinted param in different positions, making it difficult to generalize)
    setTestFunctions([
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: functionName,
        description: '',
        signatures: [
          {
            params: [{ name: 'field', type: 'keyword', hint }],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
    ]);

    const { suggest } = await setup();
    const suggestions = (
      await suggest(`FROM index | EVAL result = ${functionName}(/`, {
        callbacks,
      })
    ).map((s) => s.label);

    const suggestionsForHint = await getSuggestionsForHint(hint, undefined, callbacks);

    expect(suggestions).toEqual(suggestionsForHint);
  });

  it('hint.kind === "aggregation" suggests only aggregation and time-series-aggregation functions', async () => {
    const functionName = 'test_hint_kind_aggregation';

    setTestFunctions([
      {
        type: FunctionDefinitionTypes.AGG,
        name: functionName,
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'aggregation',
                type: 'double',
                optional: false,
                hint: { kind: 'aggregation' },
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.STATS],
      },
    ]);

    const { suggest } = await setup();
    const suggestionLabels = (await suggest(`FROM index | STATS ${functionName}(/`)).map(
      (s) => s.label
    );

    const aggNames = new Set(
      getAllFunctions({
        type: [FunctionDefinitionTypes.AGG, FunctionDefinitionTypes.TIME_SERIES_AGG],
      }).map((fn) => fn.name.toUpperCase())
    );

    // Every suggestion must be an aggregation / time-series-agg function — no fields, scalar functions, literals, operators
    for (const label of suggestionLabels) {
      expect(aggNames.has(label)).toBe(true);
    }
    // Sanity-check: a few well-known agg functions appear (gives us coverage that the path is wired up)
    for (const expected of ['MAX', 'MIN', 'AVG', 'SUM']) {
      expect(suggestionLabels).toContain(expected);
    }
    // And the parent function is excluded from its own suggestions
    expect(suggestionLabels).not.toContain(functionName.toUpperCase());
  });
});
