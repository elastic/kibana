/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isLiteral } from '../../../ast/is';
import { getExpressionType } from '..';
import type { ESQLColumnData } from '../../../commands_registry/types';
import type { ESQLFunction } from '../../../types';
import type { FunctionDefinition } from '../../types';
import { getMatchingSignatures } from '../expressions';

/**
 * Helper function to format a function signature in a readable format.
 * @param functionDef The function definition to format
 * @param fnNode ESQLFunction node to help determine the best matching signature
 * @param columns map of column data to help determine argument types
 * @returns A formatted signature string
 *
 * @example output:
 * ```typescript
 *  count_distinct(
 *    field: boolean | date | date_nanos | double,
 *    precision?: integer | long | unsigned_long
 *  ): long
 * ```
 */
export function getFormattedFunctionSignature(
  functionDef: FunctionDefinition,
  fnNode?: ESQLFunction,
  columns?: Map<string, ESQLColumnData>
): string {
  if (!functionDef.signatures || functionDef.signatures.length === 0) {
    return `${functionDef.name}()`;
  }

  // Get the signatures that matches the given args so far
  const signatures = getFilteredSignatures(functionDef, fnNode, columns);

  const returnTypes = new Set<string>();
  const parameterTypeMap = new Map<string, Set<string>>();
  const parameterOptionalMap = new Map<string, boolean>();
  const parameterSignatureCount = new Map<string, number>();
  let bestSignature = signatures[0];
  let maxParams = bestSignature.params.length;

  signatures.forEach((signature) => {
    // Collect return types
    returnTypes.add(signature.returnType);

    // Find signature with most parameters
    if (signature.params.length > maxParams) {
      maxParams = signature.params.length;
      bestSignature = signature;
    }

    // Collect parameter types, optional status, and signature count
    signature.params.forEach((param) => {
      if (!parameterTypeMap.has(param.name)) {
        parameterTypeMap.set(param.name, new Set());
        parameterOptionalMap.set(param.name, false);
        parameterSignatureCount.set(param.name, 0);
      }
      parameterTypeMap.get(param.name)!.add(param.type);
      parameterSignatureCount.set(param.name, parameterSignatureCount.get(param.name)! + 1);

      // If ANY signature has this parameter as optional, mark it as optional
      if (param.optional) {
        parameterOptionalMap.set(param.name, true);
      }
    });
  });

  // Build parameter strings with combined types
  const formattedParams = bestSignature.params.map((param) => {
    const types = parameterTypeMap.get(param.name)!;
    const typesList = Array.from(types).sort().join(' | ');

    // A parameter is optional if:
    // 1. ANY signature explicitly marks it as optional, OR
    // 2. It doesn't appear in ALL signatures
    const isExplicitlyOptional = parameterOptionalMap.get(param.name) || false;
    const appearsInAllSignatures = parameterSignatureCount.get(param.name) === signatures.length;
    const isOptional = isExplicitlyOptional || !appearsInAllSignatures;

    const optionalMarker = isOptional ? '?' : '';
    return `${param.name}${optionalMarker}: ${typesList}`;
  });

  const returnTypesList = Array.from(returnTypes).sort().join(' | ');

  if (formattedParams.length > 0) {
    const paramsString = formattedParams.join(',  \n  ');
    return `${functionDef.name} (
  ${paramsString}
): ${returnTypesList}`;
  } else {
    return `${functionDef.name}(): ${returnTypesList}`;
  }
}

/**
 * Filters function signatures based on the provided function node and columns.
 * Returns the best matching signatures if available, otherwise returns the original signatures.
 */
function getFilteredSignatures(
  functionDef: FunctionDefinition,
  fnNode?: ESQLFunction,
  columns?: Map<string, ESQLColumnData>
): FunctionDefinition['signatures'] {
  let signatures = functionDef.signatures;

  if (fnNode && columns && fnNode.args.length > 0) {
    const argTypes = fnNode.args.map((arg) => getExpressionType(arg, columns));
    const literalMask = fnNode.args.map((arg) => isLiteral(arg));

    const matchingSignatures = getMatchingSignatures(
      functionDef.signatures,
      argTypes,
      literalMask,
      false, // Accepts unknown
      true // Accepts partial matches
    );
    if (matchingSignatures.length > 0) {
      signatures = matchingSignatures;
    }
  }

  return signatures;
}
