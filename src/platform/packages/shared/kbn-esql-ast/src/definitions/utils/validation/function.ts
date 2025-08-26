/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';
import { uniqBy } from 'lodash';
import { errors, getFunctionDefinition } from '..';
import { FunctionDefinitionTypes, within } from '../../../..';
import {
  isColumn,
  isFunctionExpression,
  isIdentifier,
  isInlineCast,
  isLiteral,
  isOptionNode,
  isParamLiteral,
} from '../../../ast/is';
import type { ICommandCallbacks, ICommandContext } from '../../../commands_registry/types';
import { Location, getLocationFromCommandOrOptionName } from '../../../commands_registry/types';
import type { ESQLAst, ESQLAstItem, ESQLCommand, ESQLFunction, ESQLMessage } from '../../../types';
import { Walker } from '../../../walker';
import type {
  FunctionDefinition,
  FunctionParameterType,
  Signature,
  SupportedDataType,
} from '../../types';
import {
  getExpressionType,
  getParamAtPosition,
  getSignaturesWithMatchingArity,
  matchesArity,
} from '../expressions';
import { ColumnValidator } from './column';
import { isArrayType } from '../operators';

export function validateFunction({
  fn,
  parentCommand,
  ast,
  context,
  callbacks,
}: {
  fn: ESQLFunction;
  parentCommand: ESQLCommand;
  ast: ESQLAst;
  context: ICommandContext;
  callbacks: ICommandCallbacks;
}): ESQLMessage[] {
  const validator = new FunctionValidator(fn, parentCommand, ast, context, callbacks);

  validator.validate();

  return validator.messages;
}

class FunctionValidator {
  private readonly definition: FunctionDefinition | undefined;
  private readonly argTypes: (SupportedDataType | 'unknown')[] = [];
  private readonly argLiteralsMask: boolean[] = [];
  private readonly _messages: ESQLMessage[] = [];

  constructor(
    private readonly fn: ESQLFunction,
    private readonly parentCommand: ESQLCommand,
    private readonly ast: ESQLAst,
    private readonly context: ICommandContext,
    private readonly callbacks: ICommandCallbacks,
    private readonly parentAggFunction: string | undefined = undefined
  ) {
    this.definition = getFunctionDefinition(fn.name);
    for (const arg of this.fn.args) {
      this.argTypes.push(
        getExpressionType(arg, this.context.fields, this.context.userDefinedColumns)
      );
      this.argLiteralsMask.push(isLiteral(arg));
    }
  }

  /**
   * Runs validation checks on the function. Once validation is complete,
   * any errors found will be available in this.messages.
   */
  public validate(): void {
    if (this.definition && !this.licenseOk(this.definition.license)) {
      this.report(errors.licenseRequired(this.fn, this.definition.license!));
    }

    const nestedErrors = this.validateNestedFunctions();

    // if one or more child functions produced errors, report and stop validation
    if (nestedErrors.length) {
      this.report(...nestedErrors);
      return;
    }

    // skip validation for functions with names defined by a parameter
    // e.g. "... | EVAL ??param(..args)"
    if (isParamLiteral(this.fn.operator)) {
      return;
    }

    if (!this.definition) {
      this.report(errors.unknownFunction(this.fn));
      return;
    }

    if (this.parentAggFunction && this.definition.type === FunctionDefinitionTypes.AGG) {
      this.report(errors.nestedAggFunction(this.fn, this.parentAggFunction));
      return;
    }

    if (!this.allowedHere) {
      this.report(errors.functionNotAllowedHere(this.fn, this.location.displayName));
    }

    if (!this.hasValidArity) {
      this.report(errors.wrongNumberArgs(this.fn, this.definition));
      return;
    }

    this.validateArguments();
  }

  /**
   * Validates the function arguments against the function definition
   */
  private validateArguments(): void {
    if (!this.definition) {
      return;
    }

    // Begin signature validation
    const A = getSignaturesWithMatchingArity(this.definition, this.fn);

    if (!A.length) {
      this.report(errors.noMatchingCallSignature(this.fn, this.definition, this.argTypes));
      return;
    }

    const S = getSignaturesMatchingTypes(A, this.argTypes, this.argLiteralsMask);

    if (!S.length) {
      this.report(errors.noMatchingCallSignature(this.fn, this.definition, this.argTypes));
      return;
    }

    if (this.licenseOk(this.definition.license) && !S.some((sig) => this.licenseOk(sig.license))) {
      // The function itself is allowed at this license level, but none of the matching signatures are
      this.report(errors.licenseRequiredForSignature(this.fn, S[0]));
    }

    // Validate column arguments
    const columnMessages = this.fn.args.flat().flatMap((arg) => {
      if (isColumn(arg) || isIdentifier(arg)) {
        return new ColumnValidator(arg, this.context, this.parentCommand.name).validate();
      }
      return [];
    });

    // uniqBy is used to cover a special case in ENRICH where an implicit assignment is possible
    // so the AST actually stores an explicit "columnX = columnX" which duplicates the message
    //
    // @TODO - we will no longer need to store an assignment in the AST approach when we
    // align field availability detection with the system used by autocomplete
    // (start using columnsAfter instead of collectUserDefinedColumns)
    this.report(...uniqBy(columnMessages, ({ location }) => `${location.min}-${location.max}`));
  }

  /**
   * Reports one or more validation messages
   */
  private report(...messages: ESQLMessage[]): void {
    this._messages.push(...messages);
  }

  public get messages(): ESQLMessage[] {
    return this._messages;
  }

  /**
   * Validates the nested functions within the current function
   */
  private validateNestedFunctions(): ESQLMessage[] {
    const nestedErrors: ESQLMessage[] = [];

    const parentAggFunction = this.parentAggFunction
      ? this.parentAggFunction
      : this.definition?.type === FunctionDefinitionTypes.AGG
      ? this.definition?.name
      : undefined;

    for (const _arg of this.fn.args.flat()) {
      const arg = removeInlineCasts(_arg);
      if (isFunctionExpression(arg)) {
        const validator = new FunctionValidator(
          arg,
          this.parentCommand,
          this.ast,
          this.context,
          this.callbacks,
          parentAggFunction
        );
        validator.validate();
        nestedErrors.push(...validator.messages);
      }

      if (nestedErrors.length) {
        return nestedErrors;
      }
    }
    return nestedErrors;
  }

  /**
   * Checks if the current license level is sufficient the given license requirement
   */
  private licenseOk(license: LicenseType | undefined): boolean {
    const hasMinimumLicenseRequired = this.callbacks.hasMinimumLicenseRequired;
    if (hasMinimumLicenseRequired && license) {
      return hasMinimumLicenseRequired(license as LicenseType);
    }
    return true;
  }

  /**
   * Checks if the function is available in the current context
   */
  private get allowedHere(): boolean {
    return this.definition?.locationsAvailable.includes(this.location.id) ?? false;
  }

  /**
   * Gets information about the location of the current function
   */
  private get location(): { displayName: string; id: Location } {
    return getFunctionLocation(this.fn, this.parentCommand, this.ast, !!this.parentAggFunction);
  }

  /**
   * Checks if the function has a valid number of arguments
   */
  private get hasValidArity(): boolean {
    const { min, max } = getMaxMinNumberOfParams(this.definition!);
    const arity = this.fn.args.length;
    return arity >= min && arity <= max;
  }
}

export const PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING: FunctionParameterType[] = [
  'date',
  'date_nanos',
  'date_period',
  'time_duration',
  'version',
  'ip',
  'boolean',
];

/**
 * Returns a signature matching the given types if it exists
 * @param definition
 * @param types
 */
function getSignaturesMatchingTypes(
  signatures: Signature[],
  givenTypes: Array<SupportedDataType | 'unknown'>,
  // a boolean array indicating which args are literals
  literalMask: boolean[]
): Signature[] {
  return signatures.filter((sig) => {
    if (!matchesArity(sig, givenTypes.length)) {
      return false;
    }

    return givenTypes.every((givenType, index) => {
      // safe to assume the param is there, because we checked the length above
      const expectedType = unwrapArrayOneLevel(getParamAtPosition(sig, index)!.type);
      return argMatchesParamType(givenType, expectedType, literalMask[index]);
    });
  });
}

/**
 * Checks if the given type matches the expected parameter type
 *
 * @param givenType
 * @param expectedType
 * @param givenIsLiteral
 */
function argMatchesParamType(
  givenType: SupportedDataType | 'unknown',
  expectedType: FunctionParameterType,
  givenIsLiteral: boolean
): boolean {
  if (givenType === expectedType) return true;

  if (expectedType === 'any') return true;

  if (givenType === 'param') return true;

  if (givenType === 'unknown') return true;

  // all ES|QL functions accept null, but this is not reflected
  // in our function definitions so we let it through here
  if (givenType === 'null') return true;

  // all functions accept keywords for text parameters
  if (bothStringTypes(givenType, expectedType)) return true;

  if (
    givenIsLiteral &&
    givenType === 'keyword' &&
    PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING.includes(expectedType)
  )
    return true;

  return false;
}

/**
 * Checks if both types are string types.
 *
 * Functions in ES|QL accept `text` and `keyword` types interchangeably.
 * @param type1
 * @param type2
 * @returns
 */
function bothStringTypes(type1: string, type2: string): boolean {
  return (type1 === 'text' || type1 === 'keyword') && (type2 === 'text' || type2 === 'keyword');
}

/**
 * Identifies the location ID of the function's position
 */
function getFunctionLocation(
  fn: ESQLFunction,
  parentCommand: ESQLCommand,
  ast: ESQLAst,
  withinAggFunction: boolean
) {
  if (withinAggFunction && ast[0].name === 'ts') {
    return {
      id: Location.STATS_TIMESERIES,
      displayName: 'agg_function_in_timeseries_context',
    };
  }

  const option = Walker.find(parentCommand, (node) => isOptionNode(node) && within(fn, node));

  const displayName = (option ?? parentCommand).name;

  const id = getLocationFromCommandOrOptionName(displayName);

  return { id, displayName };
}

/**
 * Returns the maximum and minimum number of parameters allowed by a function
 *
 * Used for too-many, too-few arguments validation
 */
function getMaxMinNumberOfParams(definition: FunctionDefinition) {
  if (definition.signatures.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = Infinity;
  let max = 0;
  definition.signatures.forEach(({ params, minParams }) => {
    min = Math.min(min, minParams ?? params.filter(({ optional }) => !optional).length);
    max = Math.max(max, minParams ? Infinity : params.length);
  });
  return { min, max };
}

function removeInlineCasts(arg: ESQLAstItem): ESQLAstItem {
  if (isInlineCast(arg)) {
    return removeInlineCasts(arg.value);
  }
  return arg;
}

/**
 * Given an array type for example `string[]` it will return `string`
 */
function unwrapArrayOneLevel(type: FunctionParameterType): FunctionParameterType {
  return isArrayType(type) ? (type.slice(0, -2) as FunctionParameterType) : type;
}
