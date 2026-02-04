/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SupportedDataType,
  FunctionParameterType,
  FunctionParameter,
  Signature,
} from '../../../types';
import { argMatchesParamType } from '../../expressions';
import type { FunctionParameterContext } from './types';
import { getValidSignaturesAndTypesToSuggestNext } from '../helpers';
import type { ESQLFunction } from '../../../../../types';
import type { ICommandContext } from '../../../../registry/types';
import { acceptsArbitraryExpressions } from './utils';
import type { FunctionDefinition } from '../../../types';

/** Centralizes signature analysis using getValidSignaturesAndTypesToSuggestNext API. */
export class SignatureAnalyzer {
  private readonly signatures: Signature[];

  private readonly paramDefinitions: FunctionParameter[];

  private readonly firstArgumentType?: string; // e.g. COALESCE, CONCAT
  private readonly firstValueType?: string; // e.g. CASE
  private readonly currentParameterIndex: number;
  private readonly hasMoreMandatoryArgs: boolean;

  private constructor(
    signatures: Signature[],
    paramDefinitions: FunctionParameter[],
    firstArgumentType: string | undefined,
    firstValueType: string | undefined,
    currentParameterIndex: number,
    hasMoreMandatoryArgs: boolean
  ) {
    this.signatures = signatures;
    this.paramDefinitions = paramDefinitions;
    this.firstArgumentType = firstArgumentType;
    this.firstValueType = firstValueType;
    this.currentParameterIndex = currentParameterIndex;
    this.hasMoreMandatoryArgs = hasMoreMandatoryArgs;
  }

  /**
   * Creates SignatureAnalyzer directly from an AST node using getValidSignaturesAndTypesToSuggestNext.
   * This is the preferred factory method as it uses the existing API.
   */
  public static fromNode(
    node: ESQLFunction,
    context: ICommandContext,
    fnDefinition: FunctionDefinition
  ): SignatureAnalyzer | null {
    if (!fnDefinition) {
      return null;
    }

    const validationResult = getValidSignaturesAndTypesToSuggestNext(node, context, fnDefinition);

    const firstArgumentType = validationResult.enrichedArgs[0]?.dataType;
    // For CASE (isSignatureRepeating), the first value is at index 1
    const hasRepeatingSignature = fnDefinition.signatures.some((sig) => sig.isSignatureRepeating);
    const firstValueType = hasRepeatingSignature
      ? validationResult.enrichedArgs[1]?.dataType
      : undefined;

    return new SignatureAnalyzer(
      validationResult.validSignatures,
      validationResult.compatibleParamDefs,
      firstArgumentType,
      firstValueType,
      validationResult.argIndex,
      validationResult.hasMoreMandatoryArgs
    );
  }

  /**
   * Creates a SignatureAnalyzer from a FunctionParameterContext.
   * Returns null if context is invalid.
   *
   * Use this method when you already have a FunctionParameterContext constructed.
   * Use fromNode() when you have direct access to the AST node.
   */
  public static from(context: FunctionParameterContext | undefined): SignatureAnalyzer | null {
    if (!context?.functionDefinition) {
      return null;
    }

    // Use original signatures for isSignatureRepeating check (validSignatures may be empty for CASE beyond 2 args)
    const signatures =
      context.validSignatures && context.validSignatures.length > 0
        ? context.validSignatures
        : context.functionDefinition.signatures ?? [];
    const paramDefinitions = context.paramDefinitions ?? [];
    const firstArgumentType = context.firstArgumentType;
    const firstValueType = context.firstValueType;
    const currentParameterIndex = context.currentParameterIndex ?? 0;
    const hasMoreMandatoryArgs = Boolean(context.hasMoreMandatoryArgs);

    return new SignatureAnalyzer(
      signatures,
      paramDefinitions,
      firstArgumentType,
      firstValueType,
      currentParameterIndex,
      hasMoreMandatoryArgs
    );
  }

  /**
   * Returns true if function requires type homogeneity (COALESCE, CONCAT, etc.)
   *
   * Homogeneous functions require all parameters to be the same type.
   * Examples: COALESCE(text, text, text) or CONCAT(keyword, keyword)
   */
  public get isHomogeneous(): boolean {
    return this.signatures.every((sig) => {
      const isVariadic = sig.minParams != null;

      if (!isVariadic && sig.params.length < 2) {
        return false;
      }

      const firstParamType = sig.params[0]?.type;

      if (!firstParamType || firstParamType === 'any') {
        return false;
      }

      return sig.params.every((param) => {
        if (param.type === firstParamType) {
          return true;
        }

        // keyword and text are interchangeable in ES|QL
        if (
          (firstParamType === 'keyword' || firstParamType === 'text') &&
          (param.type === 'keyword' || param.type === 'text')
        ) {
          return true;
        }

        return false;
      });
    });
  }

  /**
   * Returns true if function is variadic (accepts unlimited parameters).
   * Examples: CONCAT, COALESCE, CASE
   */
  public get isVariadic(): boolean {
    return this.signatures.some((sig) => sig.minParams != null);
  }

  /** Returns true if function has a repeating signature pattern (e.g. CASE). */
  public get hasRepeatingSignature(): boolean {
    return this.signatures.some(({ isSignatureRepeating }) => isSignatureRepeating);
  }

  /** Returns true if a value can be accepted at current position in a repeating signature. */
  public get isRepeatingValuePosition(): boolean {
    return this.hasRepeatingSignature && this.currentParameterIndex >= 1;
  }

  /**
   * Returns true if current position in a repeating signature is ambiguous.
   * Positions 2, 4, 6... could be either a new condition OR a default value.
   */
  public get isAmbiguousPosition(): boolean {
    return (
      this.hasRepeatingSignature &&
      this.currentParameterIndex >= 2 &&
      this.currentParameterIndex % 2 === 0
    );
  }

  /**
   * Returns maximum number of parameters across all signatures.
   */
  public get maxParams(): number {
    if (this.signatures.length === 0) {
      return 0;
    }

    return Math.max(...this.signatures.map((sig) => sig.params.length));
  }

  /** Returns true if current parameter index is at or beyond max params.*/
  public get isAtMaxParams(): boolean {
    if (this.isVariadic) {
      return false;
    }

    return this.currentParameterIndex >= this.maxParams - 1;
  }

  /**
   * Returns true if more parameters can be added.
   * Considers: mandatory args, variadic functions, max params.
   */
  public get hasMoreParams(): boolean {
    if (this.hasMoreMandatoryArgs) {
      return true;
    }

    if (this.isVariadic) {
      return true;
    }

    return !this.isAtMaxParams && this.maxParams > 0;
  }

  /**
   * Checks if given type is compatible with current parameter position.
   */
  public isCurrentTypeCompatible(
    givenType: SupportedDataType | 'unknown',
    isLiteral: boolean
  ): boolean {
    if (this.paramDefinitions.length > 0) {
      return this.paramDefinitions.some((def) =>
        argMatchesParamType(givenType, def.type, isLiteral, false)
      );
    }

    if (this.isVariadic && this.firstArgumentType) {
      return argMatchesParamType(givenType, this.firstArgumentType, isLiteral, false);
    }

    return false;
  }

  /**
   * Returns compatible parameter definitions for the current position.
   */
  public getCompatibleParamDefs(): FunctionParameter[] {
    const repeatingSignature = this.signatures.find((s) => s.isSignatureRepeating);

    if (repeatingSignature && this.currentParameterIndex >= repeatingSignature.params.length) {
      const paramIndex = this.currentParameterIndex % repeatingSignature.params.length;

      // Even positions (2, 4, 6...) could be either a new condition OR a default value
      // Return both param types to allow suggestions for both cases
      if (paramIndex === 0) {
        return repeatingSignature.params; // [boolean, any]
      }

      return [repeatingSignature.params[paramIndex]];
    }

    return this.paramDefinitions;
  }

  /**
   * Returns true if there are more mandatory arguments required.
   */
  public getHasMoreMandatoryArgs(): boolean {
    return this.hasMoreMandatoryArgs;
  }

  /**
   * Returns the first argument type (used for homogeneity checks).
   */
  public getFirstArgumentType(): string | undefined {
    return this.firstArgumentType;
  }

  /**
   * Returns the first value type for CASE (index 1).
   */
  public getFirstValueType(): string | undefined {
    return this.firstValueType;
  }

  /**
   * Returns the current parameter index.
   */
  public getCurrentParameterIndex(): number {
    return this.currentParameterIndex;
  }

  /**
   * Returns valid signatures for the current function.
   */
  public getValidSignatures(): Signature[] {
    return this.signatures;
  }

  // ============================================================================
  // Public API: Type Analysis
  // ============================================================================

  /**
   * Returns true if function accepts arbitrary expressions in parameters.
   *
   * This pattern indicates functions where parameters can contain complex expressions
   * - Variadic with multiple parameters (minParams >= 2)
   * - Unknown return type (depends on arguments)
   * - Mixed parameter types (boolean + any)
   *
   * Example: CASE(condition1, value1, condition2, value2, ..., default)
   */
  public get acceptsArbitraryExpressions(): boolean {
    return acceptsArbitraryExpressions(this.signatures);
  }

  /**
   * Gets accepted types for the current/next parameter.
   *
   * Special handling for:
   * - Functions with arbitrary expressions → returns ['any']
   * - Boolean homogeneity → returns ['any'] (user can build boolean expressions)
   * - Other homogeneous types → returns types matching first parameter
   */
  public getAcceptedTypes(): FunctionParameterType[] {
    // Positions 2, 4, 6... in repeating signatures: could be condition or default → accept any
    if (this.isAmbiguousPosition) {
      return ['any'];
    }

    // Repeating signatures (e.g. CASE) require value type homogeneity
    // CASE(cond, longField, cond2, /) → suggest only long/integer at position 3
    if (this.acceptsArbitraryExpressions) {
      if (
        this.isRepeatingValuePosition &&
        this.firstValueType &&
        this.firstValueType !== 'unknown'
      ) {
        // text/keyword are interchangeable in ES|QL, so suggest both
        const isTextual = this.firstValueType === 'text' || this.firstValueType === 'keyword';

        return isTextual ? ['text', 'keyword'] : [this.firstValueType as FunctionParameterType];
      }

      return ['any'];
    }

    // Special case 2: boolean homogeneity allows any type (to build boolean expressions)
    if (this.isHomogeneous && this.firstArgumentType === 'boolean') {
      return ['any'];
    }

    // Special case 3: homogeneous variadic function with first argument type set
    // This handles COALESCE, CONCAT, GREATEST, LEAST beyond their defined params
    // IMPORTANT: Must come BEFORE paramDefinitions check because variadic functions
    // have empty paramDefinitions for parameters beyond those explicitly defined
    if (this.isHomogeneous && this.firstArgumentType && this.firstArgumentType !== 'unknown') {
      const isTextual = this.firstArgumentType === 'text' || this.firstArgumentType === 'keyword';

      return isTextual ? ['text', 'keyword'] : [this.firstArgumentType as FunctionParameterType];
    }

    // (e.g., BUCKET accepts date_period as constantOnly, but TO_DATEPERIOD() returns date_period)
    if (this.paramDefinitions.length > 0) {
      const types = this.paramDefinitions.map(({ type }) => type);

      return this.ensureKeywordAndText(types);
    }

    return ['any'];
  }

  /**
   * Checks if an expression type matches accepted parameter types.
   */
  public typeMatches(expressionType: SupportedDataType | 'unknown', isLiteral: boolean): boolean {
    // If no param definitions, check against firstArgumentType for variadic functions
    if (this.paramDefinitions.length === 0) {
      if (this.isVariadic && this.firstArgumentType) {
        return argMatchesParamType(
          expressionType,
          this.firstArgumentType as FunctionParameterType,
          isLiteral,
          false
        );
      }

      return false;
    }

    // Check if expression type matches any param definition
    return this.paramDefinitions.some((def) =>
      argMatchesParamType(expressionType, def.type, isLiteral, false)
    );
  }

  /** Returns complete parameter state for comma/operator decision engines. */
  public getParameterState(
    expressionType: SupportedDataType | 'unknown',
    isLiteral: boolean
  ): {
    typeMatches: boolean;
    isLiteral: boolean;
    hasMoreParams: boolean;
    isVariadic: boolean;
  } {
    const repeatingSignature = this.signatures.find((s) => s.isSignatureRepeating);

    let typeMatches: boolean;

    if (repeatingSignature) {
      const paramIndex = this.currentParameterIndex % repeatingSignature.params.length;
      const param = repeatingSignature.params[paramIndex];

      // Bypass PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING for boolean conditions
      // String literals should not match boolean at condition positions
      const isConditionPosition = paramIndex === 0;
      const effectiveIsLiteral =
        isConditionPosition && param.type === 'boolean' ? false : isLiteral;

      typeMatches = argMatchesParamType(expressionType, param.type, effectiveIsLiteral, false);
    } else {
      typeMatches = this.isCurrentTypeCompatible(expressionType, isLiteral);
    }

    return {
      typeMatches,
      isLiteral,
      hasMoreParams: this.hasMoreParams,
      isVariadic: this.isVariadic,
    };
  }

  private ensureKeywordAndText(types: FunctionParameterType[]): FunctionParameterType[] {
    const hasKeyword = types.includes('keyword');
    const hasText = types.includes('text');

    if (hasKeyword && !hasText) {
      return [...types, 'text'];
    }

    if (hasText && !hasKeyword) {
      return [...types, 'keyword'];
    }

    return types;
  }

  // ============================================================================
  // Static Utilities
  // ============================================================================

  /** Extracts mapParams string from function signatures (first found) */
  public static extractMapParams(
    signatures: Array<{ params: Array<{ mapParams?: string }> }>
  ): string | undefined {
    return signatures.flatMap(({ params }) => params).find(({ mapParams }) => mapParams)?.mapParams;
  }
}
