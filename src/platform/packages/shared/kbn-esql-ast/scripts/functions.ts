/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { RecursivePartial } from '@kbn/utility-types';
import type { FunctionDefinition } from '../src/definitions/types';
import { FunctionDefinitionTypes } from '../src/definitions/types';
import {
  defaultScalarFunctionLocations,
  dateDiffSuggestions,
  dateExtractOptions,
} from './constants';

export const excludedFunctions = new Set(['case', 'cast']);

export const extraFunctions: FunctionDefinition[] = [
  {
    type: FunctionDefinitionTypes.SCALAR,
    name: 'case',
    description:
      'Accepts pairs of conditions and values. The function returns the value that belongs to the first condition that evaluates to `true`. If the number of arguments is odd, the last argument is the default value which is returned when no condition matches.',
    locationsAvailable: defaultScalarFunctionLocations,
    signatures: [
      {
        params: [
          { name: 'condition', type: 'boolean' },
          { name: 'value', type: 'any' },
        ],
        minParams: 2,
        returnType: 'unknown',
      },
    ],
    examples: [
      `from index | eval type = case(languages <= 1, "monolingual", languages <= 2, "bilingual", "polyglot")`,
    ],
  },
];

/**
 * Enrichments for function definitions
 *
 * This is the place to put information that is not provided by Elasticsearch
 * and, hence, won't be present in the JSON file.
 */
export const functionEnrichments: Record<string, RecursivePartial<FunctionDefinition>> = {
  date_diff: {
    signatures: [
      {
        params: [{ suggestedValues: dateDiffSuggestions }],
      },
    ],
  },
  date_extract: {
    signatures: [
      {
        params: [{ suggestedValues: dateExtractOptions }],
      },
    ],
  },
  mv_sort: {
    signatures: new Array(10).fill({
      params: [{}, { suggestedValues: ['asc', 'desc'] }],
    }),
  },
  percentile: {
    signatures: new Array(9).fill({
      params: [{}, { constantOnly: true }],
    }),
  },
  top: {
    signatures: new Array(6).fill({
      params: [
        {},
        { constantOnly: true },
        { constantOnly: true, suggestedValues: ['asc', 'desc'] },
      ],
    }),
  },
  count: {
    signatures: [{ params: [{ supportsWildcard: true }] }],
  },
  qstr: {
    customParametersSnippet: `"""$0"""`,
  },
  kql: {
    customParametersSnippet: `"""$0"""`,
  },
};
