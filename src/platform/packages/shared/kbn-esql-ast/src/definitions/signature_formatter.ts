/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionDefinition, Signature, FunctionParameter } from './types';

/**
 * Options for formatting function signatures
 */
export interface SignatureFormatterOptions {
  /** Whether to include optional parameter indicators (default: true) */
  includeOptionalIndicators?: boolean;
  /** Whether to group signatures by parameter patterns (default: false) */
  groupByParameterPattern?: boolean;
  /** Maximum number of signatures to return (default: undefined, returns all) */
  maxSignatures?: number;
  /** Whether to deduplicate similar signatures (default: true) */
  deduplicateSimilar?: boolean;
}

/**
 * Formats a single parameter into a string representation
 */
function formatParameter(
  param: FunctionParameter,
  includeOptionalIndicators: boolean = true
): string {
  const optionalPrefix = includeOptionalIndicators && param.optional ? '?' : '';
  return `${optionalPrefix}${param.name}: ${param.type}`;
}

/**
 * Formats a single signature into a string representation
 */
function formatSignature(
  functionName: string,
  signature: Signature,
  includeOptionalIndicators: boolean = true
): string {
  const params = signature.params
    .map((param) => formatParameter(param, includeOptionalIndicators))
    .join(', ');

  return `${functionName}(${params}): ${signature.returnType}`;
}

/**
 * Groups signatures by their parameter pattern (ignoring specific types)
 */
function groupSignaturesByPattern(signatures: Signature[]): Map<string, Signature[]> {
  const groups = new Map<string, Signature[]>();

  signatures.forEach((signature) => {
    const pattern = signature.params
      .map((param) => `${param.optional ? '?' : ''}${param.name}`)
      .join(',');

    if (!groups.has(pattern)) {
      groups.set(pattern, []);
    }
    groups.get(pattern)!.push(signature);
  });

  return groups;
}

/**
 * Deduplicates signatures that have the same parameter names and optionality
 * but different types, by combining the types with union operators
 */
function deduplicateSignatures(
  functionName: string,
  signatures: Signature[],
  includeOptionalIndicators: boolean = true
): string[] {
  const groups = groupSignaturesByPattern(signatures);
  const result: string[] = [];

  groups.forEach((groupSignatures) => {
    if (groupSignatures.length === 1) {
      result.push(formatSignature(functionName, groupSignatures[0], includeOptionalIndicators));
    } else {
      // Group by parameter pattern and combine types
      const parameterPatternMap = new Map<
        string,
        {
          params: Array<{ name: string; types: Set<string>; optional: boolean }>;
          returnTypes: Set<string>;
        }
      >();

      groupSignatures.forEach((sig) => {
        const key = sig.params.map((p) => `${p.name}:${p.optional}`).join('|');

        if (!parameterPatternMap.has(key)) {
          parameterPatternMap.set(key, {
            params: sig.params.map((p) => ({
              name: p.name,
              types: new Set([p.type]),
              optional: p.optional,
            })),
            returnTypes: new Set([sig.returnType]),
          });
        } else {
          const existing = parameterPatternMap.get(key)!;
          sig.params.forEach((p, index) => {
            existing.params[index].types.add(p.type);
          });
          existing.returnTypes.add(sig.returnType);
        }
      });

      parameterPatternMap.forEach(({ params, returnTypes }) => {
        const formattedParams = params
          .map((param) => {
            const optionalPrefix = includeOptionalIndicators && param.optional ? '?' : '';
            const typeUnion = Array.from(param.types).sort().join(' | ');
            return `${optionalPrefix}${param.name}: ${typeUnion}`;
          })
          .join(', ');

        const returnTypeUnion = Array.from(returnTypes).sort().join(' | ');
        result.push(`${functionName}(${formattedParams}): ${returnTypeUnion}`);
      });
    }
  });

  return result;
}

/**
 * Creates formatted function signatures from a function definition
 *
 * @param functionDefinition The function definition to format
 * @param options Formatting options
 * @returns Array of formatted signature strings in the format: functionName(param1: type1|type2, param2: type3): returnType
 */
export function formatFunctionSignatures(
  functionDefinition: FunctionDefinition,
  options: SignatureFormatterOptions = {}
): string[] {
  const {
    includeOptionalIndicators = true,
    groupByParameterPattern = false,
    maxSignatures,
    deduplicateSimilar = true,
  } = options;

  let signatures = functionDefinition.signatures;

  // Apply max signatures limit before processing if specified
  if (maxSignatures && maxSignatures > 0) {
    signatures = signatures.slice(0, maxSignatures);
  }

  if (deduplicateSimilar) {
    return deduplicateSignatures(functionDefinition.name, signatures, includeOptionalIndicators);
  }

  if (groupByParameterPattern) {
    const groups = groupSignaturesByPattern(signatures);
    const result: string[] = [];

    groups.forEach((groupSignatures) => {
      // For each group, show one representative signature with type unions
      const firstSig = groupSignatures[0];
      const allTypes = new Map<number, Set<string>>();
      const allReturnTypes = new Set<string>();

      groupSignatures.forEach((sig) => {
        sig.params.forEach((param, index) => {
          if (!allTypes.has(index)) {
            allTypes.set(index, new Set());
          }
          allTypes.get(index)!.add(param.type);
        });
        allReturnTypes.add(sig.returnType);
      });

      const params = firstSig.params
        .map((param, index) => {
          const types = Array.from(allTypes.get(index) || new Set()).sort();
          const typeUnion = types.length > 1 ? types.join(' | ') : types[0];
          return formatParameter({ ...param, type: typeUnion }, includeOptionalIndicators);
        })
        .join(', ');

      const returnTypeUnion = Array.from(allReturnTypes).sort().join(' | ');
      result.push(`${functionDefinition.name}(${params}): ${returnTypeUnion}`);
    });

    return result;
  }

  // Default: return individual formatted signatures
  return signatures.map((signature) =>
    formatSignature(functionDefinition.name, signature, includeOptionalIndicators)
  );
}

/**
 * Creates a single summary signature that shows all possible parameter type combinations
 *
 * @param functionDefinition The function definition to summarize
 * @param options Formatting options
 * @returns A single string representing all possible signatures
 */
export function formatFunctionSignatureSummary(
  functionDefinition: FunctionDefinition,
  options: SignatureFormatterOptions = {}
): string {
  const { includeOptionalIndicators = true } = options;

  const signatures = functionDefinition.signatures;

  if (signatures.length === 0) {
    return `${functionDefinition.name}(): unknown`;
  }

  if (signatures.length === 1) {
    return formatSignature(functionDefinition.name, signatures[0], includeOptionalIndicators);
  }

  // Analyze all signatures to create a comprehensive summary
  const parameterMap = new Map<
    string,
    {
      types: Set<string>;
      optional: boolean;
      positions: Set<number>;
    }
  >();

  const allReturnTypes = new Set<string>();

  signatures.forEach((signature) => {
    signature.params.forEach((param, index) => {
      const key = param.name;
      if (!parameterMap.has(key)) {
        parameterMap.set(key, {
          types: new Set(),
          optional: param.optional,
          positions: new Set(),
        });
      }

      const paramInfo = parameterMap.get(key)!;
      paramInfo.types.add(param.type);
      paramInfo.positions.add(index);

      // A parameter is optional if it's optional in ANY signature
      if (param.optional) {
        paramInfo.optional = true;
      }
    });

    allReturnTypes.add(signature.returnType);
  });

  // Convert to sorted array by typical position
  const parameterEntries = Array.from(parameterMap.entries())
    .map(([name, info]) => ({
      name,
      ...info,
      typicalPosition: Math.min(...info.positions),
    }))
    .sort((a, b) => a.typicalPosition - b.typicalPosition);

  const params = parameterEntries
    .map(({ name, types, optional }) => {
      const optionalPrefix = includeOptionalIndicators && optional ? '?' : '';
      const typeUnion = Array.from(types).sort().join(' | ');
      return `${optionalPrefix}${name}: ${typeUnion}`;
    })
    .join(', ');

  const returnTypeUnion = Array.from(allReturnTypes).sort().join(' | ');

  return `${functionDefinition.name}(${params}): ${returnTypeUnion}`;
}
