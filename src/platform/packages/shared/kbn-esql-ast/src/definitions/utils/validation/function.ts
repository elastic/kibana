/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLLicenseType, ESQLSignatureLicenseType } from '@kbn/esql-types';
import { uniqBy } from 'lodash';
import { errors, getColumnForASTNode, getFunctionDefinition, getMessageFromId } from '..';
import { within } from '../../../..';
import {
  isAssignment,
  isColumn,
  isFunctionExpression,
  isIdentifier,
  isInlineCast,
  isList,
  isLiteral,
  isOptionNode,
  isParamLiteral,
  isParametrized,
  isTimeInterval,
} from '../../../ast/is';
import {
  ICommandCallbacks,
  ICommandContext,
  getLocationFromCommandOrOptionName,
} from '../../../commands_registry/types';
import {
  ESQLAstItem,
  ESQLCommand,
  ESQLFunction,
  ESQLLiteral,
  ESQLMessage,
  ESQLParamLiteral,
  ESQLSingleAstItem,
} from '../../../types';
import { Walker } from '../../../walker';
import {
  FieldType,
  FunctionDefinition,
  FunctionDefinitionTypes,
  FunctionParameter,
  FunctionParameterType,
  ReasonTypes,
  SupportedDataType,
  isFieldType,
} from '../../types';
import { getColumnExists, getQuotedColumnName } from '../columns';
import {
  getExpressionType,
  getParamAtPosition,
  getSignaturesWithMatchingArity,
} from '../expressions';
import { buildFunctionLookup, printFunctionSignature } from '../functions';
import {
  compareTypesWithLiterals,
  doesLiteralMatchParameterType,
  inKnownTimeInterval,
} from '../literals';
import { isArrayType } from '../operators';

export const USE_NEW_VALIDATION = true;
const validateFunction = USE_NEW_VALIDATION ? validateFunctionNew : validateFunctionOld;
export { validateFunction };

// #region New stuff

export function validateFunctionNew({
  fn,
  parentCommand,
  context,
  callbacks,
}: {
  fn: ESQLFunction;
  parentCommand: ESQLCommand;
  context: ICommandContext;
  callbacks: ICommandCallbacks;
}): ESQLMessage[] {
  return new FunctionValidator(fn, parentCommand, context, callbacks).validate();
}

class FunctionValidator {
  private definition: FunctionDefinition | undefined;
  private argTypes: (SupportedDataType | 'unknown')[] = [];
  private argLiteralsMask: boolean[] = [];

  constructor(
    private fn: ESQLFunction,
    private parentCommand: ESQLCommand,
    private context: ICommandContext,
    private callbacks: ICommandCallbacks
  ) {
    this.definition = getFunctionDefinition(fn.name);
    for (const arg of this.fn.args) {
      this.argTypes.push(
        getExpressionType(arg, this.context.fields, this.context.userDefinedColumns)
      );
      this.argLiteralsMask.push(isLiteral(arg));
    }
  }

  validate(): ESQLMessage[] {
    const nestedErrors = this.validateNestedFunctions();

    if (nestedErrors.length) {
      // if one or more child functions produced errors, stop validation and report
      return nestedErrors;
    }

    if (!this.definition) {
      return [errors.unknownFunction(this.fn)];
    }

    if (!this.licenseOk(this.definition.license)) {
      return [errors.licenseRequired(this.fn, this.definition.license!)]; // TODO - maybe don't end validation here
    }

    if (!this.availableHere) {
      const { displayName } = getFunctionLocation(this.fn, this.parentCommand);
      return [errors.functionNotAllowedHere(this.fn, displayName)];
    }

    if (!this.hasValidArity) {
      return [errors.wrongNumberArgs(this.fn, this.definition)];
    }

    return this.validateArguments();
  }

  /**
   * Validates the function arguments against the function definition
   */
  private validateArguments(): ESQLMessage[] {
    if (!this.definition) {
      return [];
    }

    // Begin validation
    const A = getSignaturesWithMatchingArity(this.definition, this.fn);

    if (!A.length) {
      return [errors.noMatchingCallSignatures(this.fn, this.definition, this.argTypes)];
    }

    const S = getSignaturesMatchingTypes(this.definition, this.argTypes, this.argLiteralsMask);

    if (!S.length) {
      return [errors.noMatchingCallSignatures(this.fn, this.definition, this.argTypes)];
    }

    if (!S.some((sig) => this.licenseOk(sig.license))) {
      return [errors.licenseRequiredForSignature(this.fn, S[0])];
    }

    return [];
  }

  /**
   * Validates the nested functions within the current function
   */
  private validateNestedFunctions(): ESQLMessage[] {
    const nestedErrors: ESQLMessage[] = [];
    for (const arg of this.fn.args.flat()) {
      if (isFunctionExpression(arg)) {
        nestedErrors.push(
          ...new FunctionValidator(arg, this.parentCommand, this.context, this.callbacks).validate()
        );
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
  private licenseOk(license: ESQLSignatureLicenseType | undefined): boolean {
    const hasMinimumLicenseRequired = this.callbacks.hasMinimumLicenseRequired;
    if (hasMinimumLicenseRequired && license) {
      return hasMinimumLicenseRequired(license as ESQLLicenseType);
    }
    return true;
  }

  /**
   * Checks if the function is available in the current context
   */
  private get availableHere(): boolean {
    const { location } = getFunctionLocation(this.fn, this.parentCommand);
    return this.definition?.locationsAvailable.includes(location) ?? false;
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

const FIELD_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING: FieldType[] = ['date', 'date_nanos'];

/**
 * Returns a signature matching the given types if it exists
 * @param definition
 * @param types
 */
function getSignaturesMatchingTypes(
  definition: FunctionDefinition,
  givenTypes: Array<SupportedDataType | 'unknown'>,
  // a boolean array indicating which args are literals
  literalMask: boolean[]
): FunctionDefinition['signatures'] {
  return definition.signatures.filter((sig) => {
    // TODO check this - it may not be correct
    if (givenTypes.length < sig.params.filter(({ optional }) => !optional).length) {
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

  if (givenType === 'null') return true;

  if (givenType === 'unknown') return true;

  if (bothStringTypes(givenType, expectedType)) return true;

  if (
    givenIsLiteral &&
    givenType === 'keyword' &&
    isFieldType(expectedType) &&
    FIELD_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING.includes(expectedType)
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
function getFunctionLocation(fn: ESQLFunction, parentCommand: ESQLCommand) {
  const option = Walker.find(parentCommand, (node) => isOptionNode(node) && within(fn, node));

  const displayName = (option ?? parentCommand).name;

  const location = getLocationFromCommandOrOptionName(displayName);

  return { location, displayName };
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

// #endregion New stuff

// #region Old stuff

export function getAllArrayValues(arg: ESQLAstItem) {
  const values: string[] = [];
  if (Array.isArray(arg)) {
    for (const subArg of arg) {
      if (Array.isArray(subArg)) {
        break;
      }
      if (subArg.type === 'literal') {
        values.push(String(subArg.value));
      }
      if (isColumn(subArg) || isTimeInterval(subArg)) {
        values.push(subArg.name);
      }
      if (subArg.type === 'function') {
        const signature = printFunctionSignature(subArg);
        if (signature) {
          values.push(signature);
        }
      }
    }
  }
  return values;
}

export function getAllArrayTypes(
  arg: ESQLAstItem,
  parentCommand: string,
  context: ICommandContext
) {
  const types = [];
  if (Array.isArray(arg)) {
    for (const subArg of arg) {
      if (Array.isArray(subArg)) {
        break;
      }
      if (subArg.type === 'literal') {
        types.push(subArg.literalType);
      }
      if (subArg.type === 'column') {
        const hit = getColumnForASTNode(subArg, {
          fields: context.fields,
          userDefinedColumns: context.userDefinedColumns,
        });
        types.push(hit?.type || 'unsupported');
      }
      if (subArg.type === 'timeInterval') {
        types.push('time_duration');
      }
      if (subArg.type === 'function') {
        if (isSupportedFunction(subArg.name, parentCommand).supported) {
          const fnDef = buildFunctionLookup().get(subArg.name)!;
          types.push(fnDef.signatures[0].returnType);
        }
      }
    }
  }
  return types;
}

const isParam = (x: unknown): x is ESQLParamLiteral =>
  !!x &&
  typeof x === 'object' &&
  (x as ESQLParamLiteral).type === 'literal' &&
  (x as ESQLParamLiteral).literalType === 'param';

/**
 * Checks if an AST function argument is of the correct type
 * given the definition.
 */
export function checkFunctionArgMatchesDefinition(
  arg: ESQLSingleAstItem,
  parameterDefinition: FunctionParameter,
  context: ICommandContext,
  parentCommand?: string
): boolean {
  const parameterType = parameterDefinition.type;
  if (parameterType === 'any') {
    return true;
  }
  if (isParam(arg)) {
    return true;
  }
  if (arg.type === 'literal') {
    const matched = doesLiteralMatchParameterType(parameterType, arg);
    return matched;
  }
  if (arg.type === 'function') {
    if (isSupportedFunction(arg.name, parentCommand).supported) {
      const fnDef = buildFunctionLookup().get(arg.name)!;
      return fnDef.signatures.some(
        (signature) =>
          signature.returnType === 'unknown' ||
          parameterType === signature.returnType ||
          bothStringTypes(parameterType, signature.returnType)
      );
    }
  }
  if (arg.type === 'timeInterval') {
    return parameterType === 'time_duration' && inKnownTimeInterval(arg.unit);
  }
  if (arg.type === 'column') {
    const hit = getColumnForASTNode(arg, {
      fields: context.fields,
      userDefinedColumns: context.userDefinedColumns,
    });
    const validHit = hit;
    if (!validHit) {
      return false;
    }
    const wrappedTypes: Array<(typeof validHit)['type']> = Array.isArray(validHit.type)
      ? validHit.type
      : [validHit.type];

    return wrappedTypes.some(
      (ct) =>
        ct === parameterType ||
        bothStringTypes(ct, parameterType) ||
        ct === 'null' ||
        ct === 'unknown'
    );
  }
  if (arg.type === 'inlineCast') {
    const lowerArgType = parameterType?.toLowerCase();
    const castedType = getExpressionType(arg);
    return castedType === lowerArgType;
  }
  return false;
}

/**
 * Filters function signatures to only include those whose parameter types
 * precisely match the provided argument types.
 */
function getTypeMatchingSignatures(
  fn: ESQLFunction,
  signatures: FunctionDefinition['signatures'],
  context: ICommandContext,
  parentCommand: string
): FunctionDefinition['signatures'] {
  return signatures.filter((signature) =>
    signature.params.every((param, index) => {
      const arg = fn.args[index];
      if (!arg) {
        return param.optional;
      }

      if (Array.isArray(arg)) {
        if (arg.length === 0) {
          return param.optional;
        }

        // all elements within an array will have the same type and we can pick up the first one
        // and pass to checkFunctionArgMatchesDefinition to check if an AST function argument is of the correct type
        const firstArg = arg[0];
        if (Array.isArray(firstArg)) {
          return false; // Nested arrays. Do we have this case?
        }

        return checkFunctionArgMatchesDefinition(firstArg, param, context, parentCommand);
      }
      return checkFunctionArgMatchesDefinition(arg, param, context, parentCommand);
    })
  );
}

/**
 * Checks if this argument is one of the possible options
 * if they are defined on the arg definition.
 *
 * TODO - Consider merging with isEqualType to create a unified arg validation function
 */
export function isValidLiteralOption(arg: ESQLLiteral, argDef: FunctionParameter) {
  const unwrapStringLiteralQuotes = (value: string) => value.slice(1, -1);
  return (
    arg.literalType === 'keyword' &&
    argDef.acceptedValues &&
    !argDef.acceptedValues
      .map((option) => option.toLowerCase())
      .includes(unwrapStringLiteralQuotes(arg.value).toLowerCase())
  );
}

/**
 * We only want to report one message when any number of the elements in an array argument is of the wrong type
 */
export function collapseWrongArgumentTypeMessages(
  messages: ESQLMessage[],
  arg: ESQLAstItem[],
  funcName: string,
  argType: string,
  parentCommand: string,
  context: ICommandContext
) {
  if (!messages.some(({ code }) => code === 'wrongArgumentType')) {
    return messages;
  }

  // Replace the individual "wrong argument type" messages with a single one for the whole array
  messages = messages.filter(({ code }) => code !== 'wrongArgumentType');

  messages.push(
    getMessageFromId({
      messageId: 'wrongArgumentType',
      values: {
        name: funcName,
        argType,
        value: `(${getAllArrayValues(arg).join(', ')})`,
        givenType: `(${getAllArrayTypes(arg, parentCommand, context).join(', ')})`,
      },
      locations: {
        min: (arg[0] as ESQLSingleAstItem).location.min,
        max: (arg[arg.length - 1] as ESQLSingleAstItem).location.max,
      },
    })
  );

  return messages;
}

const isFunctionOperatorParam = (fn: ESQLFunction): boolean =>
  !!fn.operator && isParamLiteral(fn.operator);

/**
 * Given an array type for example `string[]` it will return `string`
 */
function unwrapArrayOneLevel(type: FunctionParameterType): FunctionParameterType {
  return isArrayType(type) ? (type.slice(0, -2) as FunctionParameterType) : type;
}

/**
 * Performs validation on a function
 * @deprecated
 */
export function validateFunctionOld({
  fn,
  parentCommand,
  parentOption,
  context,
  callbacks,
  forceConstantOnly = false,
  isNested,
  parentAst,
}: {
  fn: ESQLFunction;
  parentCommand: string;
  parentOption?: string;
  context: ICommandContext;
  callbacks: ICommandCallbacks;
  forceConstantOnly?: boolean;
  isNested?: boolean;
  parentAst?: ESQLCommand[];
}): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  if (fn.incomplete) {
    return messages;
  }
  if (isFunctionOperatorParam(fn)) {
    return messages;
  }
  const fnDefinition = getFunctionDefinition(fn.name)!;

  const isFnSupported = isSupportedFunction(fn.name, parentCommand, parentOption);

  if (!isFnSupported.supported) {
    if (isFnSupported.reason === 'unknownFunction') {
      messages.push(errors.unknownFunction(fn));
    }
    // for nested functions skip this check and make the nested check fail later on
    if (isFnSupported.reason === 'unsupportedFunction' && !isNested) {
      messages.push(
        parentOption
          ? getMessageFromId({
              messageId: 'unsupportedFunctionForCommandOption',
              values: {
                name: fn.name,
                command: parentCommand.toUpperCase(),
                option: parentOption.toUpperCase(),
              },
              locations: fn.location,
            })
          : getMessageFromId({
              messageId: 'unsupportedFunctionForCommand',
              values: { name: fn.name, command: parentCommand.toUpperCase() },
              locations: fn.location,
            })
      );
    }
    if (messages.length) {
      return messages;
    }
  }

  const matchingSignatures = getSignaturesWithMatchingArity(fnDefinition, fn);

  // Check license requirements for the function
  const hasMinimumLicenseRequired = callbacks?.hasMinimumLicenseRequired;

  if (isFnSupported.supported && hasMinimumLicenseRequired) {
    const licenseMessages = validateFunctionLicense(fn, hasMinimumLicenseRequired);
    if (licenseMessages.length) {
      messages.push(...licenseMessages);
    }

    // Check signature-specific license requirements
    if (licenseMessages.length === 0 && matchingSignatures.length > 0) {
      const signatureLicenseMessages = validateSignatureLicense(
        fn,
        matchingSignatures,
        hasMinimumLicenseRequired,
        context,
        parentCommand
      );

      if (signatureLicenseMessages.length) {
        messages.push(...signatureLicenseMessages);
      }
    }
  }

  if (!matchingSignatures.length) {
    const { max, min } = getMaxMinNumberOfParams(fnDefinition);
    if (max === min) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentNumber',
          values: {
            fn: fn.name,
            numArgs: max,
            passedArgs: fn.args.length,
          },
          locations: fn.location,
        })
      );
    } else if (fn.args.length > max) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentNumberTooMany',
          values: {
            fn: fn.name,
            numArgs: max,
            passedArgs: fn.args.length,
            extraArgs: fn.args.length - max,
          },
          locations: fn.location,
        })
      );
    } else {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentNumberTooFew',
          values: {
            fn: fn.name,
            numArgs: min,
            passedArgs: fn.args.length,
            missingArgs: min - fn.args.length,
          },
          locations: fn.location,
        })
      );
    }
  }
  // now perform the same check on all functions args
  for (let i = 0; i < fn.args.length; i++) {
    const arg = fn.args[i];

    const allMatchingArgDefinitionsAreConstantOnly = matchingSignatures.every((signature) => {
      return signature.params[i]?.constantOnly;
    });
    const wrappedArray = Array.isArray(arg) ? arg : [arg];
    for (const _subArg of wrappedArray) {
      /**
       * we need to remove the inline casts
       * to see if there's a function under there
       *
       * e.g. for ABS(CEIL(numberField)::int), we need to validate CEIL(numberField)
       */
      const subArg = removeInlineCasts(_subArg);

      if (isFunctionExpression(subArg)) {
        const messagesFromArg = validateFunctionOld({
          fn: subArg,
          parentCommand,
          parentOption,
          context,
          callbacks,
          /*
           * The constantOnly constraint needs to be enforced for arguments that
           * are functions as well, regardless of whether the definition for the
           * sub function's arguments includes the constantOnly flag.
           *
           * Example:
           * bucket(@timestamp, abs(bytes), "", "")
           *
           * In the above example, the abs function is not defined with the
           * constantOnly flag, but the second parameter in bucket _is_ defined
           * with the constantOnly flag.
           *
           * Because of this, the abs function's arguments inherit the constraint
           * and each should be validated as if each were constantOnly.
           */
          forceConstantOnly: allMatchingArgDefinitionsAreConstantOnly || forceConstantOnly,
          // use the nesting flag for now just for stats and metrics
          // TODO: revisit this part later on to make it more generic
          isNested: ['stats', 'inlinestats', 'ts'].includes(parentCommand)
            ? isNested || !isAssignment(fn)
            : false,
          parentAst,
        });

        if (messagesFromArg.some(({ code }) => code === 'expectedConstant')) {
          const consolidatedMessage = getMessageFromId({
            messageId: 'expectedConstant',
            values: {
              fn: fn.name,
              given: subArg.text,
            },
            locations: subArg.location,
          });

          messages.push(
            consolidatedMessage,
            ...messagesFromArg.filter(({ code }) => code !== 'expectedConstant')
          );
        } else {
          messages.push(...messagesFromArg);
        }
      }
    }
  }

  // at this point we're sure that at least one signature is matching
  const failingSignatures: ESQLMessage[][] = [];
  let relevantFuncSignatures = matchingSignatures;
  const enrichedArgs = fn.args;

  if (fn.name === 'in' || fn.name === 'not in') {
    for (let argIndex = 1; argIndex < fn.args.length; argIndex++) {
      relevantFuncSignatures = fnDefinition.signatures.filter(
        (s) =>
          s.params?.length >= argIndex &&
          s.params.slice(0, argIndex).every(({ type: dataType }, idx) => {
            const arg = enrichedArgs[idx];

            if (isLiteral(arg)) {
              return (
                dataType === arg.literalType || compareTypesWithLiterals(dataType, arg.literalType)
              );
            }
            return false; // Non-literal arguments don't match
          })
      );
    }
  }

  for (const signature of relevantFuncSignatures) {
    const failingSignature: ESQLMessage[] = [];
    let args = fn.args;
    const second = fn.args[1];
    if (isList(second)) {
      args = [fn.args[0], second.values];
    }

    args.forEach((argument, index) => {
      const parameter = getParamAtPosition(signature, index);
      if ((!argument && parameter?.optional) || !parameter) {
        // that's ok, just skip it
        // the else case is already catched with the argument counts check
        // few lines above
        return;
      }

      // check every element of the argument (may be an array of elements, or may be a single element)
      const hasMultipleElements = Array.isArray(argument);
      const argElements = hasMultipleElements ? argument : [argument];
      const singularType = unwrapArrayOneLevel(parameter.type);
      const messagesFromAllArgElements = argElements.flatMap((arg) => {
        return [
          validateFunctionLiteralArg,
          validateNestedFunctionArg,
          validateFunctionColumnArg,
          validateInlineCastArg,
        ].flatMap((validateFn) => {
          return validateFn(
            fn,
            arg,
            {
              ...parameter,
              type: singularType,
              constantOnly: forceConstantOnly || parameter.constantOnly,
            },
            context,
            parentCommand
          );
        });
      });

      const shouldCollapseMessages = isArrayType(parameter.type as string) && hasMultipleElements;

      failingSignature.push(
        ...(shouldCollapseMessages
          ? collapseWrongArgumentTypeMessages(
              messagesFromAllArgElements,
              argument,
              fn.name,
              parameter.type as string,
              parentCommand,
              context
            )
          : messagesFromAllArgElements)
      );
    });
    if (failingSignature.length) {
      failingSignatures.push(failingSignature);
    }
  }

  if (failingSignatures.length && failingSignatures.length === relevantFuncSignatures.length) {
    const failingSignatureOrderedByErrorCount = failingSignatures
      .map((arr, index) => ({ index, count: arr.length }))
      .sort((a, b) => a.count - b.count);
    const indexForShortestFailingsignature = failingSignatureOrderedByErrorCount[0].index;
    messages.push(...failingSignatures[indexForShortestFailingsignature]);
  }
  // This is due to a special case in enrich where an implicit assignment is possible
  // so the AST needs to store an explicit "columnX = columnX" which duplicates the message
  return uniqBy(messages, ({ location }) => `${location.min}-${location.max}`);
}

function validateFunctionLiteralArg(
  astFunction: ESQLFunction,
  argument: ESQLAstItem,
  parameter: FunctionParameter,
  context: ICommandContext,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (isLiteral(argument)) {
    if (
      argument.literalType === 'keyword' &&
      parameter.acceptedValues &&
      isValidLiteralOption(argument, parameter)
    ) {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedLiteralOption',
          values: {
            name: astFunction.name,
            value: argument.value,
            supportedOptions: parameter.acceptedValues?.map((option) => `"${option}"`).join(', '),
          },
          locations: argument.location,
        })
      );
    }

    if (!checkFunctionArgMatchesDefinition(argument, parameter, context, parentCommand)) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentType',
          values: {
            name: astFunction.name,
            argType: parameter.type as string,
            value: argument.text,
            givenType: argument.literalType,
          },
          locations: argument.location,
        })
      );
    }
  }
  if (isTimeInterval(argument)) {
    // check first if it's a valid interval string
    if (!inKnownTimeInterval(argument.unit)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownInterval',
          values: {
            value: argument.unit,
          },
          locations: argument.location,
        })
      );
    } else {
      if (!checkFunctionArgMatchesDefinition(argument, parameter, context, parentCommand)) {
        messages.push(
          getMessageFromId({
            messageId: 'wrongArgumentType',
            values: {
              name: astFunction.name,
              argType: parameter.type as string,
              value: argument.name,
              givenType: 'duration',
            },
            locations: argument.location,
          })
        );
      }
    }
  }
  return messages;
}

function validateInlineCastArg(
  astFunction: ESQLFunction,
  arg: ESQLAstItem,
  parameterDefinition: FunctionParameter,
  context: ICommandContext,
  parentCommand: string
) {
  if (!isInlineCast(arg)) {
    return [];
  }

  if (!checkFunctionArgMatchesDefinition(arg, parameterDefinition, context, parentCommand)) {
    return [
      getMessageFromId({
        messageId: 'wrongArgumentType',
        values: {
          name: astFunction.name,
          argType: parameterDefinition.type as string,
          value: arg.text,
          givenType: arg.castType,
        },
        locations: arg.location,
      }),
    ];
  }

  return [];
}

function validateNestedFunctionArg(
  astFunction: ESQLFunction,
  argument: ESQLAstItem,
  parameter: FunctionParameter,
  context: ICommandContext,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (
    isFunctionExpression(argument) &&
    // no need to check the reason here, it is checked already above
    isSupportedFunction(argument.name, parentCommand).supported
  ) {
    // The isSupported check ensure the definition exists
    const argFn = getFunctionDefinition(argument.name)!;
    const fnDef = getFunctionDefinition(astFunction.name)!;
    // no nestying criteria should be enforced only for same type function
    if (fnDef.type === FunctionDefinitionTypes.AGG && argFn.type === FunctionDefinitionTypes.AGG) {
      messages.push(
        getMessageFromId({
          messageId: 'noNestedArgumentSupport',
          values: { name: argument.text, argType: argFn.signatures[0].returnType as string },
          locations: argument.location,
        })
      );
    }
    if (!checkFunctionArgMatchesDefinition(argument, parameter, context, parentCommand)) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentType',
          values: {
            name: astFunction.name,
            argType: parameter.type as string,
            value: argument.text,
            givenType: argFn.signatures[0].returnType as string,
          },
          locations: argument.location,
        })
      );
    }
  }
  return messages;
}

function validateFunctionColumnArg(
  astFunction: ESQLFunction,
  actualArg: ESQLAstItem,
  parameterDefinition: FunctionParameter,
  context: ICommandContext,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (!(isColumn(actualArg) || isIdentifier(actualArg)) || isParametrized(actualArg)) {
    return messages;
  }

  const columnName = getQuotedColumnName(actualArg);
  const columnExists = getColumnExists(actualArg, context);

  if (parameterDefinition.constantOnly) {
    messages.push(
      getMessageFromId({
        messageId: 'expectedConstant',
        values: {
          fn: astFunction.name,
          given: columnName,
        },
        locations: actualArg.location,
      })
    );

    return messages;
  }

  if (!columnExists) {
    messages.push(
      getMessageFromId({
        messageId: 'unknownColumn',
        values: {
          name: actualArg.name,
        },
        locations: actualArg.location,
      })
    );

    return messages;
  }

  if (actualArg.name === '*') {
    // special case for COUNT(*)
    return messages;
  }

  if (!checkFunctionArgMatchesDefinition(actualArg, parameterDefinition, context, parentCommand)) {
    const columnHit = getColumnForASTNode(actualArg, {
      fields: context.fields,
      userDefinedColumns: context.userDefinedColumns,
    });
    const isConflictType = columnHit && 'hasConflict' in columnHit && columnHit.hasConflict;
    if (!isConflictType) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentType',
          values: {
            name: astFunction.name,
            argType: parameterDefinition.type as string,
            value: actualArg.name,
            givenType: columnHit!.type,
          },
          locations: actualArg.location,
        })
      );
    }
  }

  return messages;
}

function removeInlineCasts(arg: ESQLAstItem): ESQLAstItem {
  if (isInlineCast(arg)) {
    return removeInlineCasts(arg.value);
  }
  return arg;
}

export function isSupportedFunction(
  name: string,
  parentCommand?: string,
  option?: string
): { supported: boolean; reason: ReasonTypes | undefined } {
  if (!parentCommand) {
    return {
      supported: false,
      reason: 'missingCommand',
    };
  }
  const fn = buildFunctionLookup().get(name);
  const isSupported = Boolean(
    fn?.locationsAvailable.includes(getLocationFromCommandOrOptionName(option ?? parentCommand))
  );
  return {
    supported: isSupported,
    reason: isSupported ? undefined : fn ? 'unsupportedFunction' : 'unknownFunction',
  };
}

function validateFunctionLicense(
  fn: ESQLFunction,
  hasMinimumLicenseRequired: ((minimumLicenseRequired: ESQLLicenseType) => boolean) | undefined
): ESQLMessage[] {
  const fnDefinition = getFunctionDefinition(fn.name);

  if (!fnDefinition) {
    return [];
  }

  const { license } = fnDefinition;

  if (!!hasMinimumLicenseRequired && license) {
    if (!hasMinimumLicenseRequired(license.toLocaleLowerCase() as ESQLLicenseType)) {
      return [
        getMessageFromId({
          messageId: 'licenseRequired',
          values: {
            name: fn.name.toUpperCase(),
            requiredLicense: license?.toUpperCase() || 'UNKNOWN',
          },
          locations: fn.location,
        }),
      ];
    }
  }

  return [];
}

/**
 * @TODO - is this necessary?
 *
 * Validates license requirements for function signatures based on argument types:
 * 1. Filters signatures to only those that match the actual argument types being used
 * 2. Checks if any matching signature is available without a license requirement
 * 3. If all matching signatures require licenses, validates user's license level
 * 4. Returns specific error messages indicating which signature requires the license
 *
 * @example
 * // For ST_EXTENT_AGG(TO_CARTESIANPOINT(field)) with BASIC license:
 * // Returns [] because cartesian_point signature doesn't require license
 *
 * // For ST_EXTENT_AGG(TO_CARTESIANSHAPE(field)) with BASIC license:
 * // Returns ["...some error message"]
 */
function validateSignatureLicense(
  fn: ESQLFunction,
  matchingSignatures: FunctionDefinition['signatures'],
  hasMinimumLicenseRequired: (minimumLicenseRequired: ESQLLicenseType) => boolean,
  context: ICommandContext,
  parentCommand: string
): ESQLMessage[] {
  if (matchingSignatures.length === 0) {
    return [];
  }

  const relevantSignatures = getTypeMatchingSignatures(
    fn,
    matchingSignatures,
    context,
    parentCommand
  );

  // If the user can use at least one signature without a license, the function is allowed
  const hasUnlicensedSignature =
    relevantSignatures.length === 0 || relevantSignatures.some((sig) => !sig.license);
  if (hasUnlicensedSignature) {
    return [];
  }

  // If the user has the required license for at least one signature, allow the function
  const hasValidLicense = relevantSignatures.some(
    (signature) =>
      signature.license &&
      hasMinimumLicenseRequired(signature.license.toLocaleLowerCase() as ESQLLicenseType)
  );

  if (hasValidLicense) {
    return [];
  }

  // Generate a specific error message indicating which signature requires the license
  // We're asserting non-null here because based on the preceding logic, all 'relevantSignatures' must have a license at this point.
  const firstLicensedSignature = relevantSignatures.find((sig) => sig.license)!;
  const requiredLicense = firstLicensedSignature.license!.toUpperCase();

  const signatureDescription = firstLicensedSignature.params
    .map((param) => `'${param.name}' of type '${param.type}'`)
    .join(', ');

  return [
    getMessageFromId({
      messageId: 'licenseRequiredForSignature',
      values: {
        name: fn.name.toUpperCase(),
        signatureDescription,
        requiredLicense,
      },
      locations: fn.location,
    }),
  ];
}

// #endregion Old stuff
