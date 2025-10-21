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

  const returnTypes = collectReturnTypes(functionDef.signatures);
  const bestSignature = findMostComprehensiveSignature(functionDef.signatures);
  const formattedParams = formatParameters(bestSignature, functionDef.signatures);

  return buildSignatureString(functionDef.name, formattedParams, returnTypes);
}

/**
 * Collects all unique return types from the function signatures
 */
function collectReturnTypes(signatures: FunctionDefinition['signatures']): Set<string> {
  const returnTypes = new Set<string>();
  signatures.forEach((signature) => {
    returnTypes.add(signature.returnType);
  });
  return returnTypes;
}

/**
 * Finds the signature with the most parameters (most complete parameter structure)
 */
function findMostComprehensiveSignature(
  signatures: FunctionDefinition['signatures']
): FunctionDefinition['signatures'][0] {
  let bestSignature = signatures[0];
  let maxParams = bestSignature.params.length;

  for (const signature of signatures) {
    if (signature.params.length > maxParams) {
      maxParams = signature.params.length;
      bestSignature = signature;
    }
  }

  return bestSignature;
}

/**
 * Gets all unique types for a parameter with the given name across all signatures
 */
function getUniqueTypesForParameter(
  paramName: string,
  signatures: FunctionDefinition['signatures']
): Set<string> {
  const types = new Set<string>();

  signatures.forEach((signature) => {
    const matchingParam = signature.params.find((p) => p.name === paramName);
    if (matchingParam) {
      types.add(matchingParam.type);
    }
  });

  return types;
}

/**
 * Formats all parameters from the best signature, merging types from all signatures
 */
function formatParameters(
  bestSignature: FunctionDefinition['signatures'][0],
  allSignatures: FunctionDefinition['signatures']
): string[] {
  return bestSignature.params.map((param) => {
    const allTypes = getUniqueTypesForParameter(param.name, allSignatures);
    const typesList = Array.from(allTypes).sort().join(' | ');
    const optionalMarker = param.optional ? '?' : '';

    return `${param.name}${optionalMarker}: ${typesList}`;
  });
}

/**
 * Builds the final formatted signature string
 */
function buildSignatureString(
  functionName: string,
  formattedParams: string[],
  returnTypes: Set<string>
): string {
  const returnTypesList = Array.from(returnTypes).sort().join(' | ');

  if (formattedParams.length > 0) {
    const paramsString = formattedParams.join(',  \n  ');
    return `\`\`\`none
${functionName}(
  ${paramsString}
): ${returnTypesList}
\`\`\``;
  } else {
    return `\`\`\`none
${functionName}(): ${returnTypesList}
\`\`\``;
  }
}
