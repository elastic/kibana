/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import uniqBy from 'lodash/uniqBy';
import {
  AstProviderFn,
  ESQLAst,
  ESQLAstItem,
  ESQLAstMetricsCommand,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandMode,
  ESQLCommandOption,
  ESQLFunction,
  ESQLMessage,
  ESQLSource,
  walk,
  isBinaryExpression,
  isIdentifier,
  isSource,
} from '@kbn/esql-ast';
import type {
  ESQLAstField,
  ESQLAstJoinCommand,
  ESQLIdentifier,
  ESQLProperNode,
} from '@kbn/esql-ast/src/types';
import {
  CommandModeDefinition,
  CommandOptionsDefinition,
  FunctionParameter,
} from '../definitions/types';
import {
  areFieldAndVariableTypesCompatible,
  extractSingularType,
  getColumnForASTNode,
  getCommandDefinition,
  getFunctionDefinition,
  isArrayType,
  isColumnItem,
  checkFunctionArgMatchesDefinition,
  isFunctionItem,
  isLiteralItem,
  isOptionItem,
  isSourceItem,
  isSupportedFunction,
  isTimeIntervalItem,
  inKnownTimeInterval,
  sourceExists,
  getColumnExists,
  hasWildcard,
  isSettingItem,
  isAssignment,
  isVariable,
  isValidLiteralOption,
  isAggFunction,
  getQuotedColumnName,
  isInlineCastItem,
  getSignaturesWithMatchingArity,
  isFunctionOperatorParam,
  isMaybeAggFunction,
  isParametrized,
} from '../shared/helpers';
import { collectVariables } from '../shared/variables';
import { getMessageFromId, errors } from './errors';
import type {
  ErrorTypes,
  ESQLRealField,
  ESQLVariable,
  ReferenceMaps,
  ValidationOptions,
  ValidationResult,
} from './types';
import type { ESQLCallbacks } from '../shared/types';
import {
  retrieveSources,
  retrieveFields,
  retrievePolicies,
  retrievePoliciesFields,
  retrieveFieldsFromStringSources,
} from './resources';
import { collapseWrongArgumentTypeMessages, getMaxMinNumberOfParams } from './helpers';
import { getParamAtPosition } from '../shared/helpers';
import {
  METADATA_FIELDS,
  UNSUPPORTED_COMMANDS_BEFORE_MATCH,
  UNSUPPORTED_COMMANDS_BEFORE_QSTR,
} from '../shared/constants';
import { compareTypesWithLiterals } from '../shared/esql_types';

const NO_MESSAGE: ESQLMessage[] = [];
function validateFunctionLiteralArg(
  astFunction: ESQLFunction,
  actualArg: ESQLAstItem,
  argDef: FunctionParameter,
  references: ReferenceMaps,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (isLiteralItem(actualArg)) {
    if (
      actualArg.literalType === 'keyword' &&
      argDef.acceptedValues &&
      isValidLiteralOption(actualArg, argDef)
    ) {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedLiteralOption',
          values: {
            name: astFunction.name,
            value: actualArg.value,
            supportedOptions: argDef.acceptedValues?.map((option) => `"${option}"`).join(', '),
          },
          locations: actualArg.location,
        })
      );
    }

    if (!checkFunctionArgMatchesDefinition(actualArg, argDef, references, parentCommand)) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentType',
          values: {
            name: astFunction.name,
            argType: argDef.type as string,
            value: actualArg.text,
            givenType: actualArg.literalType,
          },
          locations: actualArg.location,
        })
      );
    }
  }
  if (isTimeIntervalItem(actualArg)) {
    // check first if it's a valid interval string
    if (!inKnownTimeInterval(actualArg.unit)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownInterval',
          values: {
            value: actualArg.unit,
          },
          locations: actualArg.location,
        })
      );
    } else {
      if (!checkFunctionArgMatchesDefinition(actualArg, argDef, references, parentCommand)) {
        messages.push(
          getMessageFromId({
            messageId: 'wrongArgumentType',
            values: {
              name: astFunction.name,
              argType: argDef.type as string,
              value: actualArg.name,
              givenType: 'duration',
            },
            locations: actualArg.location,
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
  actualArg: ESQLAstItem,
  parameterDefinition: FunctionParameter,
  references: ReferenceMaps,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (
    isFunctionItem(actualArg) &&
    // no need to check the reason here, it is checked already above
    isSupportedFunction(actualArg.name, parentCommand).supported
  ) {
    // The isSupported check ensure the definition exists
    const argFn = getFunctionDefinition(actualArg.name)!;
    const fnDef = getFunctionDefinition(astFunction.name)!;
    // no nestying criteria should be enforced only for same type function
    if (fnDef.type === 'agg' && argFn.type === 'agg') {
      messages.push(
        getMessageFromId({
          messageId: 'noNestedArgumentSupport',
          values: { name: actualArg.text, argType: argFn.signatures[0].returnType as string },
          locations: actualArg.location,
        })
      );
    }
    if (
      !checkFunctionArgMatchesDefinition(actualArg, parameterDefinition, references, parentCommand)
    ) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentType',
          values: {
            name: astFunction.name,
            argType: parameterDefinition.type as string,
            value: actualArg.text,
            givenType: argFn.signatures[0].returnType as string,
          },
          locations: actualArg.location,
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
  if (!(isColumnItem(actualArg) || isIdentifier(actualArg))) {
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

  return messages;
}

function removeInlineCasts(arg: ESQLAstItem): ESQLAstItem {
  if (isInlineCastItem(arg)) {
    return removeInlineCasts(arg.value);
  }
  return arg;
}

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

function validateFunction({
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
          isNested: ['stats', 'inlinestats', 'metrics'].includes(parentCommand)
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

  if (fn.name === 'in' || fn.name === 'not_in') {
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
    fn.args.forEach((outerArg, index) => {
      const argDef = getParamAtPosition(signature, index);
      if ((!outerArg && argDef?.optional) || !argDef) {
        // that's ok, just skip it
        // the else case is already catched with the argument counts check
        // few lines above
        return;
      }

      // check every element of the argument (may be an array of elements, or may be a single element)
      const hasMultipleElements = Array.isArray(outerArg);
      const argElements = hasMultipleElements ? outerArg : [outerArg];
      const singularType = extractSingularType(argDef.type);
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
              ...argDef,
              type: singularType,
              constantOnly: forceConstantOnly || argDef.constantOnly,
            },
            references,
            parentCommand
          );
        });
      });

      const shouldCollapseMessages = isArrayType(argDef.type as string) && hasMultipleElements;
      failingSignature.push(
        ...(shouldCollapseMessages
          ? collapseWrongArgumentTypeMessages(
              messagesFromAllArgElements,
              outerArg,
              fn.name,
              argDef.type as string,
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

function validateSetting(
  setting: ESQLCommandMode,
  settingDef: CommandModeDefinition | undefined,
  command: ESQLCommand,
  referenceMaps: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  if (setting.incomplete || command.incomplete) {
    return messages;
  }
  if (!settingDef) {
    const commandDef = getCommandDefinition(command.name);
    messages.push(
      getMessageFromId({
        messageId: 'unsupportedSetting',
        values: {
          setting: setting.name,
          expected: commandDef.modes.map(({ name }) => name).join(', '),
        },
        locations: setting.location,
      })
    );
    return messages;
  }
  if (
    settingDef.values.every(({ name }) => name !== setting.name) ||
    // enforce the check on the prefix if present
    (settingDef.prefix && !setting.text.startsWith(settingDef.prefix))
  ) {
    messages.push(
      getMessageFromId({
        messageId: 'unsupportedSettingCommandValue',
        values: {
          command: command.name.toUpperCase(),
          value: setting.text,
          // for some reason all this enums are uppercase in ES
          expected: settingDef.values
            .map(({ name }) => `${settingDef.prefix || ''}${name}`)
            .join(', ')
            .toUpperCase(),
        },
        locations: setting.location,
      })
    );
  }
  return messages;
}

/**
 * Validate that a function is an aggregate function or that all children
 * recursively terminate at either a literal or an aggregate function.
 */
const isFunctionAggClosed = (fn: ESQLFunction): boolean =>
  isMaybeAggFunction(fn) || areFunctionArgsAggClosed(fn);

const areFunctionArgsAggClosed = (fn: ESQLFunction): boolean =>
  fn.args.every((arg) => isLiteralItem(arg) || (isFunctionItem(arg) && isFunctionAggClosed(arg))) ||
  isFunctionOperatorParam(fn);

/**
 * Looks for first nested aggregate function in an aggregate function, recursively.
 */
const findNestedAggFunctionInAggFunction = (agg: ESQLFunction): ESQLFunction | undefined => {
  for (const arg of agg.args) {
    if (isFunctionItem(arg)) {
      return isMaybeAggFunction(arg) ? arg : findNestedAggFunctionInAggFunction(arg);
    }
  }
};

/**
 * Looks for first nested aggregate function in another aggregate a function,
 * recursively.
 *
 * @param fn Function to check for nested aggregate functions.
 * @param parentIsAgg Whether the parent function of `fn` is an aggregate function.
 * @returns The first nested aggregate function in `fn`, or `undefined` if none is found.
 */
const findNestedAggFunction = (
  fn: ESQLFunction,
  parentIsAgg: boolean = false
): ESQLFunction | undefined => {
  if (isMaybeAggFunction(fn)) {
    return parentIsAgg ? fn : findNestedAggFunctionInAggFunction(fn);
  }

  for (const arg of fn.args) {
    if (isFunctionItem(arg)) {
      const nestedAgg = findNestedAggFunction(arg, parentIsAgg || isAggFunction(fn));
      if (nestedAgg) return nestedAgg;
    }
  }
};

/**
 * Validates aggregates fields: `... <aggregates> ...`.
 */
const validateAggregates = (
  command: ESQLCommand,
  aggregates: ESQLAstField[],
  references: ReferenceMaps
) => {
  const messages: ESQLMessage[] = [];

  // Should never happen.
  if (!aggregates.length) {
    messages.push(errors.unexpected(command.location));
    return messages;
  }

  let hasMissingAggregationFunctionError = false;

  for (const aggregate of aggregates) {
    if (isFunctionItem(aggregate)) {
      messages.push(
        ...validateFunction({
          fn: aggregate,
          parentCommand: command.name,
          parentOption: undefined,
          references,
        })
      );

      let hasAggregationFunction = false;

      walk(aggregate, {
        visitFunction: (fn) => {
          const definition = getFunctionDefinition(fn.name);
          if (!definition) return;
          if (definition.type === 'agg') hasAggregationFunction = true;
        },
      });

      if (!hasAggregationFunction) {
        hasMissingAggregationFunctionError = true;
        messages.push(errors.noAggFunction(command, aggregate));
      }
    } else if (isColumnItem(aggregate) || isIdentifier(aggregate)) {
      messages.push(errors.unknownAggFunction(aggregate));
    } else {
      // Should never happen.
    }
  }

  if (hasMissingAggregationFunctionError) {
    return messages;
  }

  for (const aggregate of aggregates) {
    if (isFunctionItem(aggregate)) {
      const fn = isAssignment(aggregate) ? aggregate.args[1] : aggregate;
      if (isFunctionItem(fn) && !isFunctionAggClosed(fn)) {
        messages.push(errors.expressionNotAggClosed(command, fn));
      }
    }
  }

  if (messages.length) {
    return messages;
  }

  for (const aggregate of aggregates) {
    if (isFunctionItem(aggregate)) {
      const aggInAggFunction = findNestedAggFunction(aggregate);
      if (aggInAggFunction) {
        messages.push(errors.aggInAggFunction(aggInAggFunction));
        break;
      }
    }
  }

  return messages;
};

/**
 * Validates grouping fields of the BY clause: `... BY <grouping>`.
 */
const validateByGrouping = (
  fields: ESQLAstItem[],
  commandName: string,
  referenceMaps: ReferenceMaps,
  multipleParams: boolean
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  for (const field of fields) {
    if (!Array.isArray(field)) {
      if (!multipleParams) {
        if (isColumnItem(field)) {
          messages.push(...validateColumnForCommand(field, commandName, referenceMaps));
        }
      } else {
        if (isColumnItem(field)) {
          messages.push(...validateColumnForCommand(field, commandName, referenceMaps));
        }
        if (isFunctionItem(field)) {
          messages.push(
            ...validateFunction({
              fn: field,
              parentCommand: commandName,
              parentOption: 'by',
              references: referenceMaps,
            })
          );
        }
      }
    }
  }
  return messages;
};

function validateOption(
  option: ESQLCommandOption,
  optionDef: CommandOptionsDefinition | undefined,
  command: ESQLCommand,
  referenceMaps: ReferenceMaps
): ESQLMessage[] {
  // check if the arguments of the option are of the correct type
  const messages: ESQLMessage[] = [];
  if (option.incomplete || command.incomplete) {
    return messages;
  }
  if (!optionDef) {
    messages.push(
      getMessageFromId({
        messageId: 'unknownOption',
        values: { command: command.name.toUpperCase(), option: option.name },
        locations: option.location,
      })
    );
    return messages;
  }
  // use dedicate validate fn if provided
  if (optionDef.validate) {
    const fields = METADATA_FIELDS;
    messages.push(...optionDef.validate(option, command, new Set(fields)));
  }
  if (!optionDef.skipCommonValidation) {
    option.args.forEach((arg) => {
      if (!Array.isArray(arg)) {
        if (!optionDef.signature.multipleParams) {
          if (isColumnItem(arg)) {
            messages.push(...validateColumnForCommand(arg, command.name, referenceMaps));
          }
        } else {
          if (isColumnItem(arg)) {
            messages.push(...validateColumnForCommand(arg, command.name, referenceMaps));
          }
          if (isFunctionItem(arg)) {
            messages.push(
              ...validateFunction({
                fn: arg,
                parentCommand: command.name,
                parentOption: option.name,
                references: referenceMaps,
              })
            );
          }
        }
      }
    });
  }

  return messages;
}

function validateSource(
  source: ESQLSource,
  commandName: string,
  { sources, policies }: ReferenceMaps
) {
  const messages: ESQLMessage[] = [];
  if (source.incomplete) {
    return messages;
  }

  const commandDef = getCommandDefinition(commandName);
  const isWildcardAndNotSupported =
    hasWildcard(source.name) && !commandDef.signature.params.some(({ wildcards }) => wildcards);
  if (isWildcardAndNotSupported) {
    messages.push(
      getMessageFromId({
        messageId: 'wildcardNotSupportedForCommand',
        values: { command: commandName.toUpperCase(), value: source.name },
        locations: source.location,
      })
    );
  } else {
    if (source.sourceType === 'index' && !sourceExists(source.name, sources)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownIndex',
          values: { name: source.name },
          locations: source.location,
        })
      );
    } else if (source.sourceType === 'policy' && !policies.has(source.name)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownPolicy',
          values: { name: source.name },
          locations: source.location,
        })
      );
    }
  }

  return messages;
}

function validateColumnForCommand(
  column: ESQLColumn | ESQLIdentifier,
  commandName: string,
  references: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  if (commandName === 'row') {
    if (!references.variables.has(column.name) && !isParametrized(column)) {
      messages.push(errors.unknownColumn(column));
    }
  } else {
    const columnName = getQuotedColumnName(column);
    if (getColumnExists(column, references)) {
      const commandDef = getCommandDefinition(commandName);
      const columnParamsWithInnerTypes = commandDef.signature.params.filter(
        ({ type, innerTypes }) => type === 'column' && innerTypes
      );
      // this should be guaranteed by the columnCheck above
      const columnRef = getColumnForASTNode(column, references)!;

      if (columnParamsWithInnerTypes.length) {
        const hasSomeWrongInnerTypes = columnParamsWithInnerTypes.every(
          ({ innerTypes }) =>
            innerTypes &&
            !innerTypes.includes('any') &&
            !innerTypes.some((type) => compareTypesWithLiterals(type, columnRef.type))
        );
        if (hasSomeWrongInnerTypes) {
          const supportedTypes: string[] = columnParamsWithInnerTypes
            .map(({ innerTypes }) => innerTypes)
            .flat()
            .filter((type) => type !== undefined) as string[];

          messages.push(
            getMessageFromId({
              messageId: 'unsupportedColumnTypeForCommand',
              values: {
                command: commandName.toUpperCase(),
                type: supportedTypes.join(', '),
                typeCount: supportedTypes.length,
                givenType: columnRef.type,
                column: columnName,
              },
              locations: column.location,
            })
          );
        }
      }
      if (
        hasWildcard(columnName) &&
        !isVariable(columnRef) &&
        !commandDef.signature.params.some(({ type, wildcards }) => type === 'column' && wildcards)
      ) {
        messages.push(
          getMessageFromId({
            messageId: 'wildcardNotSupportedForCommand',
            values: {
              command: commandName.toUpperCase(),
              value: columnName,
            },
            locations: column.location,
          })
        );
      }
    } else {
      if (column.name) {
        messages.push(errors.unknownColumn(column));
      }
    }
  }
  return messages;
}

export function validateSources(
  command: ESQLCommand,
  sources: ESQLSource[],
  references: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  for (const source of sources) {
    messages.push(...validateSource(source, command.name, references));
  }

  return messages;
}

/**
 * Validates the METRICS source command:
 *
 *     METRICS <sources> [ <aggregates> [ BY <grouping> ]]
 */
const validateMetricsCommand = (
  command: ESQLAstMetricsCommand,
  references: ReferenceMaps
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const { sources, aggregates, grouping } = command;

  // METRICS <sources> ...
  messages.push(...validateSources(command, sources, references));

  // ... <aggregates> ...
  if (aggregates && aggregates.length) {
    messages.push(...validateAggregates(command, aggregates, references));

    // ... BY <grouping>
    if (grouping && grouping.length) {
      messages.push(...validateByGrouping(grouping, 'metrics', references, true));
    }
  }

  return messages;
};

/**
 * Validates the JOIN command:
 *
 *     <LEFT | RIGHT | LOOKUP> JOIN <target> ON <conditions>
 *     <LEFT | RIGHT | LOOKUP> JOIN index [ = alias ] ON <condition> [, <condition> [, ...]]
 */
const validateJoinCommand = (
  command: ESQLAstJoinCommand,
  references: ReferenceMaps
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const { commandType, args } = command;
  const { joinIndices } = references;

  if (!['left', 'right', 'lookup'].includes(commandType)) {
    return [errors.unexpected(command.location, 'JOIN command type')];
  }

  const target = args[0] as ESQLProperNode;
  let index: ESQLSource;
  let alias: ESQLIdentifier | undefined;

  if (isBinaryExpression(target)) {
    if (target.name === 'as') {
      alias = target.args[1] as ESQLIdentifier;
      index = target.args[0] as ESQLSource;

      if (!isSource(index) || !isIdentifier(alias)) {
        return [errors.unexpected(target.location)];
      }
    } else {
      return [errors.unexpected(target.location)];
    }
  } else if (isSource(target)) {
    index = target as ESQLSource;
  } else {
    return [errors.unexpected(target.location)];
  }

  let isIndexFound = false;
  for (const { name, aliases } of joinIndices) {
    if (index.name === name) {
      isIndexFound = true;
      break;
    }

    if (aliases) {
      for (const aliasName of aliases) {
        if (index.name === aliasName) {
          isIndexFound = true;
          break;
        }
      }
    }
  }

  if (!isIndexFound) {
    const error = errors.invalidJoinIndex(index);
    messages.push(error);

    return messages;
  }

  return messages;
};

function validateCommand(
  command: ESQLCommand,
  references: ReferenceMaps,
  ast: ESQLAst,
  currentCommandIndex: number
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  if (command.incomplete) {
    return messages;
  }
  // do not check the command exists, the grammar is already picking that up
  const commandDef = getCommandDefinition(command.name);

  if (!commandDef) {
    return messages;
  }

  if (commandDef.validate) {
    messages.push(...commandDef.validate(command));
  }

  switch (commandDef.name) {
    case 'metrics': {
      const metrics = command as ESQLAstMetricsCommand;
      messages.push(...validateMetricsCommand(metrics, references));
      break;
    }
    case 'join': {
      const join = command as ESQLAstJoinCommand;
      const joinCommandErrors = validateJoinCommand(join, references);
      messages.push(...joinCommandErrors);
      break;
    }
    default: {
      // Now validate arguments
      for (const commandArg of command.args) {
        const wrappedArg = Array.isArray(commandArg) ? commandArg : [commandArg];
        for (const arg of wrappedArg) {
          if (isFunctionItem(arg)) {
            messages.push(
              ...validateFunction({
                fn: arg,
                parentCommand: command.name,
                parentOption: undefined,
                references,
                parentAst: ast,
                currentCommandIndex,
              })
            );
          } else if (isSettingItem(arg)) {
            messages.push(...validateSetting(arg, commandDef.modes[0], command, references));
          } else if (isOptionItem(arg)) {
            messages.push(
              ...validateOption(
                arg,
                commandDef.options.find(({ name }) => name === arg.name),
                command,
                references
              )
            );
          } else if (isColumnItem(arg) || isIdentifier(arg)) {
            if (command.name === 'stats' || command.name === 'inlinestats') {
              messages.push(errors.unknownAggFunction(arg));
            } else {
              messages.push(...validateColumnForCommand(arg, command.name, references));
            }
          } else if (isTimeIntervalItem(arg)) {
            messages.push(
              getMessageFromId({
                messageId: 'unsupportedTypeForCommand',
                values: {
                  command: command.name.toUpperCase(),
                  type: 'date_period',
                  value: arg.name,
                },
                locations: arg.location,
              })
            );
          } else if (isSourceItem(arg)) {
            messages.push(...validateSource(arg, command.name, references));
          }
        }
      }
    }
  }

  // no need to check for mandatory options passed
  // as they are already validated at syntax level
  return messages;
}

function validateFieldsShadowing(
  fields: Map<string, ESQLRealField>,
  variables: Map<string, ESQLVariable[]>
) {
  const messages: ESQLMessage[] = [];
  for (const variable of variables.keys()) {
    if (fields.has(variable)) {
      const variableHits = variables.get(variable)!;
      if (!areFieldAndVariableTypesCompatible(fields.get(variable)?.type, variableHits[0].type)) {
        const fieldType = fields.get(variable)!.type;
        const variableType = variableHits[0].type;
        const flatFieldType = fieldType;
        const flatVariableType = variableType;
        messages.push(
          getMessageFromId({
            messageId: 'shadowFieldType',
            values: {
              field: variable,
              fieldType: flatFieldType,
              newType: flatVariableType,
            },
            locations: variableHits[0].location,
          })
        );
      }
    }
  }

  return messages;
}

function validateUnsupportedTypeFields(fields: Map<string, ESQLRealField>, ast: ESQLAst) {
  const usedColumnsInQuery: string[] = [];

  walk(ast, {
    visitColumn: (node) => usedColumnsInQuery.push(node.name),
  });
  const messages: ESQLMessage[] = [];
  for (const column of usedColumnsInQuery) {
    if (fields.has(column) && fields.get(column)!.type === 'unsupported') {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedFieldType',
          values: {
            field: column,
          },
          locations: { min: 1, max: 1 },
        })
      );
    }
  }
  return messages;
}

export const ignoreErrorsMap: Record<keyof ESQLCallbacks, ErrorTypes[]> = {
  getColumnsFor: ['unknownColumn', 'wrongArgumentType', 'unsupportedFieldType'],
  getSources: ['unknownIndex'],
  getPolicies: ['unknownPolicy'],
  getPreferences: [],
  getFieldsMetadata: [],
  getVariablesByType: [],
  canSuggestVariables: [],
  getJoinIndices: [],
};

/**
 * ES|QL validation public API
 * It takes a query string and returns a list of messages (errors and warnings) after validate
 * The astProvider is optional, but if not provided the default one from '@kbn/esql-validation-autocomplete' will be used.
 * This is useful for async loading the ES|QL parser and reduce the bundle size, or to swap grammar version.
 * As for the callbacks, while optional, the validation function will selectively ignore some errors types based on each callback missing.
 */
export async function validateQuery(
  queryString: string,
  astProvider: AstProviderFn,
  options: ValidationOptions = {},
  callbacks?: ESQLCallbacks
): Promise<ValidationResult> {
  const result = await validateAst(queryString, astProvider, callbacks);
  // early return if we do not want to ignore errors
  if (!options.ignoreOnMissingCallbacks) {
    return result;
  }
  const finalCallbacks = callbacks || {};
  const errorTypoesToIgnore = Object.entries(ignoreErrorsMap).reduce((acc, [key, errorCodes]) => {
    if (
      !(key in finalCallbacks) ||
      (key in finalCallbacks && finalCallbacks[key as keyof ESQLCallbacks] == null)
    ) {
      for (const e of errorCodes) {
        acc[e] = true;
      }
    }
    return acc;
  }, {} as Partial<Record<ErrorTypes, boolean>>);
  const filteredErrors = result.errors
    .filter((error) => {
      if ('severity' in error) {
        return true;
      }
      return !errorTypoesToIgnore[error.code as ErrorTypes];
    })
    .map((error) =>
      'severity' in error
        ? {
            text: error.message,
            code: error.code!,
            type: 'error' as const,
            location: { min: error.startColumn, max: error.endColumn },
          }
        : error
    );
  return { errors: filteredErrors, warnings: result.warnings };
}

/**
 * This function will perform an high level validation of the
 * query AST. An initial syntax validation is already performed by the parser
 * while here it can detect things like function names, types correctness and potential warnings
 * @param ast A valid AST data structure
 */
async function validateAst(
  queryString: string,
  astProvider: AstProviderFn,
  callbacks?: ESQLCallbacks
): Promise<ValidationResult> {
  const messages: ESQLMessage[] = [];

  const parsingResult = await astProvider(queryString);

  const { ast } = parsingResult;

  const [sources, availableFields, availablePolicies, joinIndices] = await Promise.all([
    // retrieve the list of available sources
    retrieveSources(ast, callbacks),
    // retrieve available fields (if a source command has been defined)
    retrieveFields(queryString, ast, callbacks),
    // retrieve available policies (if an enrich command has been defined)
    retrievePolicies(ast, callbacks),
    // retrieve indices for join command
    callbacks?.getJoinIndices?.(),
  ]);

  if (availablePolicies.size) {
    const fieldsFromPoliciesMap = await retrievePoliciesFields(ast, availablePolicies, callbacks);
    fieldsFromPoliciesMap.forEach((value, key) => availableFields.set(key, value));
  }

  if (ast.some(({ name }) => ['grok', 'dissect'].includes(name))) {
    const fieldsFromGrokOrDissect = await retrieveFieldsFromStringSources(
      queryString,
      ast,
      callbacks
    );
    fieldsFromGrokOrDissect.forEach((value, key) => {
      // if the field is already present, do not overwrite it
      // Note: this can also overlap with some variables
      if (!availableFields.has(key)) {
        availableFields.set(key, value);
      }
    });
  }

  const variables = collectVariables(ast, availableFields, queryString);
  // notify if the user is rewriting a column as variable with another type
  messages.push(...validateFieldsShadowing(availableFields, variables));
  messages.push(...validateUnsupportedTypeFields(availableFields, ast));

  for (const [index, command] of ast.entries()) {
    const references: ReferenceMaps = {
      sources,
      fields: availableFields,
      policies: availablePolicies,
      variables,
      query: queryString,
      joinIndices: joinIndices?.indices || [],
    };
    const commandMessages = validateCommand(command, references, ast, index);
    messages.push(...commandMessages);
  }

  return {
    errors: [...parsingResult.errors, ...messages.filter(({ type }) => type === 'error')],
    warnings: messages.filter(({ type }) => type === 'warning'),
  };
}
