/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RecursivePartial } from '@kbn/utility-types';
import type { FunctionDefinition } from './types';
import { generatedFunctions } from './agg_functions_generated';
import { enrichGeneratedFunctionDefinitions } from './functions';

const functionEnrichments: Record<string, RecursivePartial<FunctionDefinition>> = {
  percentile: {
    signatures: [
      {
        params: [{}, { literalOnly: true }],
      },
    ],
  },
  count: {
    signatures: new Array(8).fill({
      params: [{ supportsWildcard: true }],
    }),
  },
};

export const statsAggregationFunctionDefinitions: FunctionDefinition[] =
  enrichGeneratedFunctionDefinitions(generatedFunctions, functionEnrichments).map((fn) => {
    fn.signatures.forEach(
      (signature) => signature.params.forEach((param) => (param.noNestingFunctions = true)) // true for all agg functions
    );

    return {
      ...fn,
      supportedCommands: ['stats'],
    };
  });
