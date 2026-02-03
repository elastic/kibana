/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isLiteral } from '../../../../ast/is';
import { getExpressionType } from '..';
import type { UnmappedFieldsStrategy } from '../../../registry/types';
import { type ESQLColumnData } from '../../../registry/types';
import type { ESQLFunction } from '../../../../types';
import type { FunctionDefinition } from '../../types';
import { getMatchingSignatures } from '../expressions';

/**
 * Formats a list of types with optional limiting and overflow indicator.
 * Examples:
 * - "boolean | date | double"
 * - "boolean | date | double|…+2 more" (when remainingCount > 1)
 */
function formatTypesList(types: Set<string>, maxTypesToShow?: number): string {
  const typeSeparator = '|';
  const sortedTypes = Array.from(types).sort();

  if (maxTypesToShow !== undefined && sortedTypes.length > maxTypesToShow) {
    const remainingCount = sortedTypes.length - maxTypesToShow;

    // If only one type is remaining, show it instead of "+1 more"
    if (remainingCount === 1) {
      return sortedTypes.join(typeSeparator);
    }

    const displayedTypes = sortedTypes.slice(0, maxTypesToShow);
    return `${displayedTypes.join(typeSeparator)}${i18n.translate(
      'kbn-esql-language.esql.hover.functions.moreTypes',
      {
        defaultMessage: `{typeSeparator}…+{remainingCount} more`,
        values: { remainingCount, typeSeparator },
      }
    )}`;
  }

  return sortedTypes.join(typeSeparator);
}

/**
 * Helper function to format a function signature in a readable format.
 * @param functionDef The function definition to format
 * @param fnNode ESQLFunction node to help determine the best matching signature
 * @param columns map of column data to help determine argument types
 * @param maxParamTypesToShow Maximum number of parameter types to show per parameter
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
  columns?: Map<string, ESQLColumnData>,
  unmappedFieldsStrategy?: UnmappedFieldsStrategy,
  maxTypesToShow?: number
): string {
  if (!functionDef.signatures || functionDef.signatures.length === 0) {
    return `${functionDef.name}()`;
  }

  // Get the signatures that matches the given args so far
  const signatures = getFilteredSignatures(functionDef, fnNode, columns, unmappedFieldsStrategy);

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
    const typesList = formatTypesList(types, maxTypesToShow);

    // A parameter is optional if:
    // 1. ANY signature explicitly marks it as optional, OR
    // 2. It doesn't appear in ALL signatures
    const isExplicitlyOptional = parameterOptionalMap.get(param.name) || false;
    const appearsInAllSignatures = parameterSignatureCount.get(param.name) === signatures.length;
    const isOptional = isExplicitlyOptional || !appearsInAllSignatures;

    const optionalMarker = isOptional ? '?' : '';
    return `${param.name}${optionalMarker}:${typesList}`;
  });

  // Format return types with the same limiting logic
  const returnTypesList = formatTypesList(returnTypes, maxTypesToShow);
  if (formattedParams.length > 0) {
    const paramsString = formattedParams.join(',  \n  ');
    return `${functionDef.name.toUpperCase()}(
  ${paramsString}
): ${returnTypesList}`;
  } else {
    return `${functionDef.name.toUpperCase()}(): ${returnTypesList}`;
  }
}

/**
 * Filters function signatures based on the provided function node and columns.
 * Returns the best matching signatures if available, otherwise returns the original signatures.
 */
function getFilteredSignatures(
  functionDef: FunctionDefinition,
  fnNode?: ESQLFunction,
  columns?: Map<string, ESQLColumnData>,
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
): FunctionDefinition['signatures'] {
  let signatures = functionDef.signatures;

  if (fnNode && columns && fnNode.args.length > 0) {
    const argTypes = fnNode.args.map((arg) =>
      getExpressionType(arg, columns, unmappedFieldsStrategy)
    );
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
    } else {
      // Try again without the last argument (in case user is typing it and it's incomplete)
      const argTypesWithoutLast = argTypes.slice(0, -1);
      const literalMaskWithoutLast = literalMask.slice(0, -1);
      const partialMatchingSignatures = getMatchingSignatures(
        functionDef.signatures,
        argTypesWithoutLast,
        literalMaskWithoutLast,
        false,
        true
      );
      if (partialMatchingSignatures.length > 0) {
        signatures = partialMatchingSignatures;
      }
    }
  }

  return signatures;
}
