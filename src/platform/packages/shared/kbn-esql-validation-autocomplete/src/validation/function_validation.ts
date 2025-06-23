/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAstItem, ESQLCommand, ESQLFunction, ESQLMessage, isIdentifier } from '@kbn/esql-ast';
import { uniqBy } from 'lodash';
import { isList } from '@kbn/esql-ast/src/ast/helpers';
import {
  isLiteralItem,
  isTimeIntervalItem,
  isFunctionItem,
  isSupportedFunction,
  getFunctionDefinition,
  isColumnItem,
  isAssignment,
} from '../..';
import { FunctionParameter, FunctionDefinitionTypes } from '../definitions/types';
import {
  UNSUPPORTED_COMMANDS_BEFORE_MATCH,
  UNSUPPORTED_COMMANDS_BEFORE_QSTR,
} from '../shared/constants';
import {
  isValidLiteralOption,
  checkFunctionArgMatchesDefinition,
  inKnownTimeInterval,
  isInlineCastItem,
  getQuotedColumnName,
  getColumnExists,
  getColumnForASTNode,
  isFunctionOperatorParam,
  getSignaturesWithMatchingArity,
  getParamAtPosition,
  unwrapArrayOneLevel,
  isArrayType,
  isParametrized,
} from '../shared/helpers';
import { getMessageFromId, errors } from './errors';
import { getMaxMinNumberOfParams, collapseWrongArgumentTypeMessages } from './helpers';
import { ReferenceMaps } from './types';
import { compareTypesWithLiterals } from '../shared/esql_types';

const NO_MESSAGE: ESQLMessage[] = [];

/**
 * Performs validation on a function
 */
export function validateFunction({
  fn,
  parentCommand,
  parentOption,
  references,
  forceConstantOnly = false,
  isNested,
  parentAst,
  currentCommandIndex,
}: {
  fn: ESQLFunction;
  parentCommand: string;
  parentOption?: string;
  references: ReferenceMaps;
  forceConstantOnly?: boolean;
  isNested?: boolean;
  parentAst?: ESQLCommand[];
  currentCommandIndex?: number;
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

  if (typeof textSearchFunctionsValidators[fn.name] === 'function') {
    const validator = textSearchFunctionsValidators[fn.name];
    messages.push(
      ...validator({
        fn,
        parentCommand,
        parentOption,
        references,
        isNested,
        parentAst,
        currentCommandIndex,
      })
    );
  }
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

      if (isFunctionItem(subArg)) {
        const messagesFromArg = validateFunction({
          fn: subArg,
          parentCommand,
          parentOption,
          references,
          /**
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
  // check if the definition has some specific validation to apply:
  if (fnDefinition.validate) {
    const payloads = fnDefinition.validate(fn);
    if (payloads.length) {
      messages.push(...payloads);
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

            if (isLiteralItem(arg)) {
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
            references,
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
              references
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

// #region Arg validation

function validateFunctionLiteralArg(
  astFunction: ESQLFunction,
  argument: ESQLAstItem,
  parameter: FunctionParameter,
  references: ReferenceMaps,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (isLiteralItem(argument)) {
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

    if (!checkFunctionArgMatchesDefinition(argument, parameter, references, parentCommand)) {
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
  if (isTimeIntervalItem(argument)) {
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
      if (!checkFunctionArgMatchesDefinition(argument, parameter, references, parentCommand)) {
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
  references: ReferenceMaps,
  parentCommand: string
) {
  if (!isInlineCastItem(arg)) {
    return [];
  }

  if (!checkFunctionArgMatchesDefinition(arg, parameterDefinition, references, parentCommand)) {
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
  references: ReferenceMaps,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (
    isFunctionItem(argument) &&
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
    if (!checkFunctionArgMatchesDefinition(argument, parameter, references, parentCommand)) {
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
  references: ReferenceMaps,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (!(isColumnItem(actualArg) || isIdentifier(actualArg)) || isParametrized(actualArg)) {
    return messages;
  }

  const columnName = getQuotedColumnName(actualArg);
  const columnExists = getColumnExists(actualArg, references);

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
    // if function does not support wildcards return a specific error
    if (!('supportsWildcard' in parameterDefinition) || !parameterDefinition.supportsWildcard) {
      messages.push(
        getMessageFromId({
          messageId: 'noWildcardSupportAsArg',
          values: {
            name: astFunction.name,
          },
          locations: actualArg.location,
        })
      );
    }

    return messages;
  }

  if (
    !checkFunctionArgMatchesDefinition(actualArg, parameterDefinition, references, parentCommand)
  ) {
    const columnHit = getColumnForASTNode(actualArg, references);
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
  if (isInlineCastItem(arg)) {
    return removeInlineCasts(arg.value);
  }
  return arg;
}

// #endregion

// #region Specific functions

function validateIfHasUnsupportedCommandPrior(
  fn: ESQLFunction,
  parentAst: ESQLCommand[] = [],
  unsupportedCommands: Set<string>,
  currentCommandIndex?: number
) {
  if (currentCommandIndex === undefined) {
    return NO_MESSAGE;
  }
  const unsupportedCommandsPrior = parentAst.filter(
    (cmd, idx) => idx <= currentCommandIndex && unsupportedCommands.has(cmd.name)
  );

  if (unsupportedCommandsPrior.length > 0) {
    return [
      getMessageFromId({
        messageId: 'fnUnsupportedAfterCommand',
        values: {
          function: fn.name.toUpperCase(),
          command: unsupportedCommandsPrior[0].name.toUpperCase(),
        },
        locations: fn.location,
      }),
    ];
  }
  return NO_MESSAGE;
}

const validateMatchFunction: FunctionValidator = ({
  fn,
  parentCommand,
  parentOption,
  references,
  forceConstantOnly = false,
  isNested,
  parentAst,
  currentCommandIndex,
}) => {
  if (fn.name === 'match') {
    if (parentCommand !== 'where') {
      return [
        getMessageFromId({
          messageId: 'onlyWhereCommandSupported',
          values: { fn: fn.name },
          locations: fn.location,
        }),
      ];
    }
    return validateIfHasUnsupportedCommandPrior(
      fn,
      parentAst,
      UNSUPPORTED_COMMANDS_BEFORE_MATCH,
      currentCommandIndex
    );
  }
  return NO_MESSAGE;
};

type FunctionValidator = (args: {
  fn: ESQLFunction;
  parentCommand: string;
  parentOption?: string;
  references: ReferenceMaps;
  forceConstantOnly?: boolean;
  isNested?: boolean;
  parentAst?: ESQLCommand[];
  currentCommandIndex?: number;
}) => ESQLMessage[];

const validateQSTRFunction: FunctionValidator = ({
  fn,
  parentCommand,
  parentOption,
  references,
  forceConstantOnly = false,
  isNested,
  parentAst,
  currentCommandIndex,
}) => {
  if (fn.name === 'qstr') {
    return validateIfHasUnsupportedCommandPrior(
      fn,
      parentAst,
      UNSUPPORTED_COMMANDS_BEFORE_QSTR,
      currentCommandIndex
    );
  }
  return NO_MESSAGE;
};

const textSearchFunctionsValidators: Record<string, FunctionValidator> = {
  match: validateMatchFunction,
  qstr: validateQSTRFunction,
};

// #endregion
