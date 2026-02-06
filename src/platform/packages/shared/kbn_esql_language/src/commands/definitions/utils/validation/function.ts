/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';
import { errors, getFunctionDefinition } from '..';
import { FunctionDefinitionTypes } from '../../../../..';
import {
  isColumn,
  isFunctionExpression,
  isIdentifier,
  isInlineCast,
  isLiteral,
  isParamLiteral,
} from '../../../../ast/is';
import { getLocationInfo } from '../../../registry/location';
import type { ICommandCallbacks, ICommandContext, Location } from '../../../registry/types';
import type {
  ESQLAst,
  ESQLAstAllCommands,
  ESQLAstItem,
  ESQLFunction,
  ESQLMessage,
} from '../../../../types';
import type { FunctionDefinition, SupportedDataType } from '../../types';
import { getExpressionType, getMatchingSignatures } from '../expressions';
import { ColumnValidator } from './column';

export function validateFunction({
  fn,
  parentCommand,
  ast,
  context,
  callbacks,
}: {
  fn: ESQLFunction;
  parentCommand: ESQLAstAllCommands;
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
    private readonly parentCommand: ESQLAstAllCommands,
    private readonly ast: ESQLAst,
    private readonly context: ICommandContext,
    private readonly callbacks: ICommandCallbacks,
    private readonly parentAggFunction: string | undefined = undefined
  ) {
    this.definition = getFunctionDefinition(fn.name);
    for (const _arg of this.fn.args) {
      const arg = Array.isArray(_arg) ? _arg[0] : _arg; // for some reason, some args are wrapped in an array, for example named params

      this.argTypes.push(
        getExpressionType(arg, this.context.columns, this.context.unmappedFieldsStrategy)
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

    const S = getMatchingSignatures(
      this.definition.signatures,
      this.argTypes,
      this.argLiteralsMask,
      true
    );

    if (!S.length) {
      this.report(errors.noMatchingCallSignature(this.fn, this.definition, this.argTypes));
      return;
    }

    if (this.licenseOk(this.definition.license) && !S.some((sig) => this.licenseOk(sig.license))) {
      // The function itself is allowed at this license level, but none of the matching signatures are
      this.report(errors.licenseRequiredForSignature(this.fn, S[0]));
    }

    // Validate column arguments
    const columnsToValidate = [];
    const flatArgs = this.fn.args.flat();
    for (let i = 0; i < flatArgs.length; i++) {
      const arg = flatArgs[i];
      if (
        (isColumn(arg) || isIdentifier(arg)) &&
        !(this.definition.name === '=' && i === 0) && // don't validate left-hand side of assignment
        !(this.definition.name === 'as' && i === 1) // don't validate right-hand side of AS
      ) {
        columnsToValidate.push(arg);
      }
    }

    const columnMessages = columnsToValidate.flatMap((arg) => {
      return new ColumnValidator(arg, this.context, this.parentCommand.name).validate();
    });

    this.report(...columnMessages);
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
    return getLocationInfo(this.fn, this.parentCommand, this.ast, !!this.parentAggFunction);
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
