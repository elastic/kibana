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

const allUniqueParameterHints = uniqBy(
  getAllFunctions()
    .flatMap((fn) => fn.signatures)
    .flatMap((signature) => signature.params)
    .flatMap((param) => (param.hint ? [param.hint] : [])),
  'entityType'
);

describe('function parameters autocomplete from hints', () => {
  const callbacks: ESQLCallbacks = {
    getInferenceEndpoints: async () => {
      return {
        inferenceEndpoints: [{ inference_id: 'inference_endpoint_1', task_type: 'text_embedding' }],
      };
    },
  };

  it.each(allUniqueParameterHints)('should resolve suggestions for $entityType', async (hint) => {
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
});
