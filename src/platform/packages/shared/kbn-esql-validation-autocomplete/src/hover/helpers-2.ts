/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type FunctionDefinition } from '@kbn/esql-ast/src/definitions/types';

/**
 * Helper function to format a function signature in a readable format.
 * @param functionDef The function definition to format
 * @returns A formatted signature string
 *
 * @example
 * ```typescript
 * import { countDistinctDefinition } from './generated/aggregation_functions';
 * import { formatFunctionSignature } from './helpers';
 *
 * console.log(formatFunctionSignature(countDistinctDefinition));
 * // Output:
 * // count_distinct(
 * //   field: boolean | date | date_nanos | double | integer | ip | keyword | long | text | version,
 * //   precision?: integer | long | unsigned_long
 * // ): long
 * ```
 */
export function formatFunctionSignature(functionDef: FunctionDefinition): string {
  if (!functionDef.signatures || functionDef.signatures.length === 0) {
    return `${functionDef.name}()`;
  }

  // Single pass to collect all data we need
  const returnTypes = new Set<string>();
  const parameterTypeMap = new Map<string, Set<string>>();
  let bestSignature = functionDef.signatures[0];
  let maxParams = bestSignature.params.length;

  // Single iteration to collect return types, parameter types, and find best signature
  functionDef.signatures.forEach((signature) => {
    // Collect return types
    returnTypes.add(signature.returnType);

    // Find signature with most parameters
    if (signature.params.length > maxParams) {
      maxParams = signature.params.length;
      bestSignature = signature;
    }

    // Collect parameter types in a single pass
    signature.params.forEach((param) => {
      if (!parameterTypeMap.has(param.name)) {
        parameterTypeMap.set(param.name, new Set());
      }
      parameterTypeMap.get(param.name)!.add(param.type);
    });
  });

  // Format parameters using pre-collected data
  const formattedParams = bestSignature.params.map((param) => {
    const types = parameterTypeMap.get(param.name)!;
    const typesList = Array.from(types).sort().join(' | ');
    const optionalMarker = param.optional ? '?' : '';
    return `${param.name}${optionalMarker}: ${typesList}`;
  });

  // Build final string
  const returnTypesList = Array.from(returnTypes).sort().join(' | ');

  if (formattedParams.length > 0) {
    const paramsString = formattedParams.join(',  \n  ');
    return `\`\`\`none
${functionDef.name}(
  ${paramsString}
): ${returnTypesList}
\`\`\``;
  } else {
    return `\`\`\`none
${functionDef.name}(): ${returnTypesList}
\`\`\``;
  }
}
