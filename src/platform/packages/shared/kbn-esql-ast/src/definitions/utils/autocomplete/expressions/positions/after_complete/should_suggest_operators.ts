/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedDataType } from '../../../../../types';
import { supportsArithmeticOperations } from '../../../../../types';
import type { ExpressionContext, FunctionParameterContext } from '../../types';
import { SignatureAnalyzer } from '../../signature_analyzer';
import {
  arithmeticOperators,
  comparisonFunctions,
  logicalOperators,
  patternMatchOperators,
  inOperators,
  nullCheckOperators,
} from '../../../../../all_operators';

export interface OperatorRuleContext {
  expressionType: SupportedDataType | 'unknown';
  functionParameterContext?: FunctionParameterContext;
  ctx: ExpressionContext;
}

export interface OperatorDecision {
  shouldSuggest: boolean;
  allowedOperators?: string[];
  reason?: string;
}

/** Determines whether operators should be suggested for the current context. */
export function shouldSuggestOperators(context: OperatorRuleContext): OperatorDecision {
  for (const rule of rules) {
    const decision = rule(context);

    if (decision !== null) {
      return decision;
    }
  }

  // Fallback (should never reach here due to default rule)
  return { shouldSuggest: true, reason: 'fallback' };
}

type Rule = (context: OperatorRuleContext) => OperatorDecision | null;

// Rules are evaluated in order. The first rule that returns a decision (non-null) wins.
// Order matters: specific rules must come before general rules to avoid being shadowed.
//
// Rule ordering logic:
// 1. Context-based rules (no function context, any type, boolean)
// 2. Homogeneous function rules (first param, subsequent params)
// 3. Type-specific rules (numeric, string/text, single string)
// 4. Default fallback

const rules: Rule[] = [
  // Rule 1: No function context - allow operators (filtered by type and expression preference)
  (ctx) => {
    if (!ctx.functionParameterContext) {
      const { expressionType } = ctx;
      const preferredType = ctx.ctx.options.preferredExpressionType;

      if (expressionType === 'text' || expressionType === 'keyword') {
        const isBooleanContext = preferredType === 'boolean' || preferredType === 'any';

        const stringOperators = [
          ...(isBooleanContext ? comparisonFunctions.map(({ name }) => name) : []),
          ...patternMatchOperators.map(({ name }) => name),
          ...inOperators.map(({ name }) => name),
          ...nullCheckOperators.map(({ name }) => name),
        ];

        return {
          shouldSuggest: true,
          allowedOperators: stringOperators,
          reason: isBooleanContext
            ? 'Boolean/any context - all operators for text/keyword fields'
            : 'Non-boolean context - string operators only',
        };
      }

      // For other types, allow all operators
      return { shouldSuggest: true, reason: 'Not inside function parameter' };
    }
    return null;
  },

  // Rule 2: String operators for text/keyword types
  // MUST come before "Parameter accepts 'any'" to limit operators for strings
  (ctx) => {
    const { expressionType, functionParameterContext } = ctx;

    // Only apply to text/keyword types
    if (expressionType !== 'text' && expressionType !== 'keyword') {
      return null;
    }

    // functionParameterContext is guaranteed to exist (Rule 1 already handled the case where it doesn't)
    const analyzer = SignatureAnalyzer.from(functionParameterContext);
    if (!analyzer) {
      return null;
    }

    const acceptedTypes = analyzer.getAcceptedTypes();
    const acceptsBoolean = acceptedTypes.includes('boolean');
    const acceptsAny = acceptedTypes.includes('any');

    // Special case: for homogeneous functions at first parameter, check if ANY signature accepts boolean
    // (not just validSignatures which may be filtered by current field type)
    const isFirstParamOfHomogeneous =
      analyzer.isHomogeneous && (functionParameterContext?.currentParameterIndex ?? 0) === 0;

    if (isFirstParamOfHomogeneous && functionParameterContext) {
      const allSignatures = functionParameterContext.functionDefinition?.signatures || [];
      const hasBooleanSignature = allSignatures.some((sig) => sig.params[0]?.type === 'boolean');

      if (hasBooleanSignature) {
        const stringOperators = [
          ...patternMatchOperators.map(({ name }) => name),
          ...inOperators.map(({ name }) => name),
          ...nullCheckOperators.map(({ name }) => name),
        ];

        return {
          shouldSuggest: true,
          allowedOperators: stringOperators,
          reason:
            'Homogeneous function first parameter - string operators for boolean expression creation',
        };
      }
    }
    const acceptsCurrentType =
      acceptedTypes.includes(expressionType) || acceptedTypes.includes('any');

    // If parameter accepts boolean OR any, suggest string-specific operators
    // (any includes boolean, so we can create boolean expressions)
    if (acceptsBoolean || acceptsAny) {
      const stringOperators = [
        ...patternMatchOperators.map(({ name }) => name), // LIKE, NOT LIKE, RLIKE, NOT RLIKE
        ...inOperators.map(({ name }) => name), // IN, NOT IN
        ...nullCheckOperators.map(({ name }) => name), // IS NULL, IS NOT NULL
      ];

      return {
        shouldSuggest: true,
        allowedOperators: stringOperators,
        reason: 'String operators: pattern matching (LIKE), membership (IN), null checks',
      };
    }

    // If parameter accepts current type but NOT boolean, block operators
    // Example: TRIM(textField) - accepts text/keyword directly, not boolean → no operators
    if (acceptsCurrentType && !acceptsBoolean) {
      return {
        shouldSuggest: false,
        reason: 'Function accepts string directly without boolean expressions',
      };
    }

    return null;
  },

  // Rule 3: Parameter accepts 'any' type - allow all operators
  (ctx) => {
    const paramDefs = ctx.functionParameterContext?.paramDefinitions;
    if (paramDefs?.some((def) => def.type === 'any')) {
      return { shouldSuggest: true, reason: 'Parameter accepts any type' };
    }
    return null;
  },

  // Rule 4: Boolean expression - allow logical operators
  (ctx) => {
    if (ctx.expressionType === 'boolean') {
      return { shouldSuggest: true, reason: 'Boolean expression allows logical operators' };
    }
    return null;
  },

  // Rule 5: Homogeneous function - first parameter
  // Check if boolean signature exists to allow operator-based type switching
  (ctx) => {
    const { functionParameterContext } = ctx;
    if (!functionParameterContext) {
      return null;
    }

    const analyzer = SignatureAnalyzer.from(functionParameterContext);
    if (!analyzer?.isHomogeneous) {
      return null;
    }

    const isFirstParam = (functionParameterContext.currentParameterIndex ?? 0) === 0;
    if (!isFirstParam) {
      return null;
    }

    // At first param of homogeneous function:
    // Allow operators if boolean signature exists among VALID signatures
    // (only signatures that match already-given arguments)
    const signatures = functionParameterContext.validSignatures;

    if (!signatures) {
      return { shouldSuggest: false, reason: 'Missing validSignatures' };
    }

    const hasBooleanSig = signatures.some((sig) => sig.params[0]?.type === 'boolean');

    if (!hasBooleanSig) {
      return {
        shouldSuggest: false,
        reason: 'No boolean signature available',
      };
    }

    // For text/keyword fields, limit to string-specific operators
    if (ctx.expressionType === 'text' || ctx.expressionType === 'keyword') {
      const stringOperators = [
        ...patternMatchOperators.map(({ name }) => name), // LIKE, NOT LIKE, RLIKE, NOT RLIKE
        ...inOperators.map(({ name }) => name), // IN, NOT IN
        ...nullCheckOperators.map(({ name }) => name), // IS NULL, IS NOT NULL
      ];

      return {
        shouldSuggest: true,
        allowedOperators: stringOperators,
        reason: 'Homogeneous function with boolean signature - string operators only',
      };
    }

    return {
      shouldSuggest: true,
      reason: 'Can switch to boolean signature',
    };
  },

  // Rule 6: Homogeneous function - subsequent parameters
  // Constrain operators based on first parameter type
  (ctx) => {
    const { functionParameterContext, expressionType } = ctx;
    if (!functionParameterContext) {
      return null;
    }

    const analyzer = SignatureAnalyzer.from(functionParameterContext);
    if (!analyzer?.isHomogeneous) {
      return null;
    }

    const isAfterFirst = (functionParameterContext.currentParameterIndex ?? 0) > 0;
    if (!isAfterFirst) {
      return null;
    }

    // Subsequent params must match first param type
    // Only boolean allows operators (logical AND/OR)
    const firstType = functionParameterContext.firstArgumentType;

    if (firstType === 'boolean') {
      // If current expression is already boolean, suggest only logical operators
      if (expressionType === 'boolean') {
        // Use logicalOperators from all_operators (AND, OR) - NOT is excluded as it's unary
        const logicalOperatorNames = logicalOperators.map((op) => op.name.toUpperCase());

        return {
          shouldSuggest: true,
          allowedOperators: logicalOperatorNames,
          reason: 'Boolean homogeneous function - boolean expression',
        };
      }

      // If current expression is NOT boolean (e.g., integerField after "integerField > 10,")
      // Allow ALL operators so user can build boolean expression (integerField > 5)
      return {
        shouldSuggest: true,
        reason: 'Boolean homogeneous function - allow building boolean expression',
      };
    }

    // Special case: editing the first parameter (expressionType matches firstParamType)
    if (firstType === expressionType) {
      const signatures = functionParameterContext.validSignatures;

      if (!signatures) {
        return { shouldSuggest: false, reason: 'Missing validSignatures' };
      }

      const hasBooleanSignature = signatures.some((sig) => {
        if (sig.params.length === 0) {
          return false;
        }
        return sig.params[0].type === 'boolean';
      });

      if (hasBooleanSignature) {
        return {
          shouldSuggest: true,
          reason: 'Can still switch signature at subsequent param',
        };
      }

      // This enables expressions like COALESCE(bytes, bytes + 10)
      if (supportsArithmeticOperations(firstType) && supportsArithmeticOperations(expressionType)) {
        return {
          shouldSuggest: true,
          allowedOperators: arithmeticOperators.map(({ name }) => name),
          reason: 'Numeric homogeneous function - allow arithmetic operators',
        };
      }
    }

    return {
      shouldSuggest: false,
      reason: `Homogeneous ${firstType} function`,
    };
  },

  // Rule 7: Numeric context - restrict to arithmetic operators only
  // Skip for homogeneous first param (already handled by Rule 5)
  (ctx) => {
    const { expressionType, functionParameterContext } = ctx;

    if (typeof expressionType !== 'string' || !supportsArithmeticOperations(expressionType)) {
      return null;
    }

    const analyzer = SignatureAnalyzer.from(functionParameterContext);
    if (!analyzer) {
      return null;
    }

    // Do not constrain the first parameter for homogeneous functions
    if (analyzer.isHomogeneous && (functionParameterContext?.currentParameterIndex ?? 0) === 0) {
      return null;
    }

    const acceptedTypes = analyzer.getAcceptedTypes();
    const acceptsBooleanOrAny = acceptedTypes.includes('boolean') || acceptedTypes.includes('any');
    const allNumeric = acceptedTypes.every((type) => supportsArithmeticOperations(type));

    if (allNumeric && !acceptsBooleanOrAny) {
      return {
        shouldSuggest: true,
        allowedOperators: arithmeticOperators.map(({ name }) => name),
        reason: 'Numeric parameter context',
      };
    }

    return null;
  },

  // Rule 8: Default fallback - allow all operators
  (_ctx) => {
    return { shouldSuggest: true, reason: 'Default: allow operators' };
  },
];
