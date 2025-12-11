/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { FunctionDefinition } from '../src/commands/definitions/types';
import { FunctionDefinitionTypes } from '../src/commands/definitions/types';
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
        isSignatureRepeating: true,
      },
    ],
    examples: [
      `from index | eval type = case(languages <= 1, "monolingual", languages <= 2, "bilingual", "polyglot")`,
    ],
  },
];

/**
 * Generic function to enrich function parameters based on parameter names
 * @param functionDefinition - The function definition to enrich
 * @param parameterName - Name of the parameter to enrich (e.g., 'order', 'limit', 'precision')
 * @param enrichments - Enrichment configuration to apply
 * @returns Enriched function definition
 */
export function enrichFunctionSignatures(
  functionDefinition: FunctionDefinition,
  parameterName: string,
  enrichments: {
    constantOnly?: boolean;
    suggestedValues?: string[];
    [key: string]: any;
  }
): FunctionDefinition {
  if (!functionDefinition.signatures) return functionDefinition;

  const enrichedSignatures = functionDefinition.signatures.map((signature) => {
    if (!signature.params) return signature;

    const enrichedParams = signature.params.map((param) => {
      if (param.name === parameterName) {
        return {
          ...param,
          ...enrichments,
        };
      }
      return param;
    });

    return {
      ...signature,
      params: enrichedParams,
    };
  });

  return {
    ...functionDefinition,
    signatures: enrichedSignatures,
  };
}

/**
 * Applies function-specific parameter enrichments to ES|QL function definitions.
 *
 * This function enriches function parameters with additional metadata like constantOnly
 * flags and suggested values based on predefined rules for specific ES|QL functions.
 *
 * @param functionDefinition - The ES|QL function definition to enrich
 * @returns The enriched function definition with parameter-specific enhancements
 *
 * @example
 * ```typescript
 * const topFunction = { name: 'top', signatures: [...] };
 * const enriched = enrichFunctionSignatures(topFunction);
 * // Returns function with 'limit' marked as constantOnly and 'order' with suggested values
 * ```
 *
 * @remarks
 * Currently supports enrichments for:
 * - `top`: Marks 'limit' as constantOnly, 'order' as constantOnly with ['asc', 'desc'] suggestions
 * - `date_diff`: Adds unit suggestions from dateDiffSuggestions
 * - `date_extract`: Adds datePart suggestions from dateExtractOptions
 * - `mv_sort`: Marks 'order' as constantOnly with ['asc', 'desc'] suggestions
 * - `percentile`: Marks 'percentile' parameter as constantOnly
 * - `count_distinct`: Marks 'precision' parameter as constantOnly
 * - `count`: Marks 'percentile' parameter as constantOnly
 * - `round`: Marks 'decimals' parameter as constantOnly
 * - `round_to`: Marks 'points' parameter as constantOnly
 * - `qstr`: Adds custom parameter snippet for triple-quoted strings
 * - `kql`: Adds custom parameter snippet for triple-quoted strings
 */
export function enrichFunctionParameters(functionDefinition: FunctionDefinition) {
  if (functionDefinition.name === 'top') {
    const rules = [
      {
        parameterName: 'limit',
        enrichments: {
          constantOnly: true,
        },
      },
      {
        parameterName: 'order',
        enrichments: {
          constantOnly: true,
          suggestedValues: ['asc', 'desc'],
        },
      },
    ];
    let enrichedDefinition = functionDefinition;
    for (const rule of rules) {
      enrichedDefinition = enrichFunctionSignatures(
        enrichedDefinition,
        rule.parameterName,
        rule.enrichments
      );
    }
    return enrichedDefinition;
  }
  if (functionDefinition.name === 'date_diff') {
    return enrichFunctionSignatures(functionDefinition, 'unit', {
      suggestedValues: dateDiffSuggestions,
    });
  }

  if (functionDefinition.name === 'date_extract') {
    return enrichFunctionSignatures(functionDefinition, 'datePart', {
      suggestedValues: dateExtractOptions,
    });
  }

  if (functionDefinition.name === 'mv_sort') {
    return enrichFunctionSignatures(functionDefinition, 'order', {
      constantOnly: true,
      suggestedValues: ['asc', 'desc'],
    });
  }

  if (functionDefinition.name === 'percentile') {
    return enrichFunctionSignatures(functionDefinition, 'percentile', {
      constantOnly: true,
    });
  }

  if (functionDefinition.name === 'count_distinct') {
    return enrichFunctionSignatures(functionDefinition, 'precision', {
      constantOnly: true,
    });
  }

  if (functionDefinition.name === 'count') {
    return enrichFunctionSignatures(functionDefinition, 'percentile', {
      constantOnly: true,
    });
  }

  if (functionDefinition.name === 'mv_contains') {
    return enrichFunctionSignatures(functionDefinition, 'superset', {
      supportsMultiValues: true,
    });
  }

  if (functionDefinition.name === 'round') {
    return enrichFunctionSignatures(functionDefinition, 'decimals', {
      constantOnly: true,
    });
  }

  if (functionDefinition.name === 'round_to') {
    return enrichFunctionSignatures(functionDefinition, 'points', {
      constantOnly: true,
    });
  }

  if (functionDefinition.name === 'qstr') {
    return {
      ...functionDefinition,
      customParametersSnippet: `"""$0"""`,
    };
  }

  if (functionDefinition.name === 'kql') {
    return {
      ...functionDefinition,
      customParametersSnippet: `"""$0"""`,
    };
  }

  return functionDefinition;
}
