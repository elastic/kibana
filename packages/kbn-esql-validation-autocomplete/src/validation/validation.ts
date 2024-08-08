/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uniqBy from 'lodash/uniqBy';
import {
  AstProviderFn,
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
} from '@kbn/esql-ast';
import type { ESQLAstField } from '@kbn/esql-ast/src/types';
import {
  CommandModeDefinition,
  CommandOptionsDefinition,
  FunctionParameter,
  FunctionDefinition,
} from '../definitions/types';
import {
  areFieldAndVariableTypesCompatible,
  extractSingularType,
  lookupColumn,
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
  hasCCSSource,
  isSettingItem,
  isAssignment,
  isVariable,
  isValidLiteralOption,
  isAggFunction,
  getQuotedColumnName,
  isInlineCastItem,
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
import { getParamAtPosition } from '../autocomplete/helper';
import { METADATA_FIELDS } from '../shared/constants';
import { isStringType } from '../shared/esql_types';

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
      actualArg.literalType === 'string' &&
      argDef.literalOptions &&
      isValidLiteralOption(actualArg, argDef)
    ) {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedLiteralOption',
          values: {
            name: astFunction.name,
            value: actualArg.value,
            supportedOptions: argDef.literalOptions?.map((option) => `"${option}"`).join(', '),
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
            value: typeof actualArg.value === 'number' ? actualArg.value : String(actualArg.value),
            givenType: actualArg.literalType,
          },
          locations: actualArg.location,
        })
      );
    }
  }
  if (isTimeIntervalItem(actualArg)) {
    // check first if it's a valid interval string
    if (!inKnownTimeInterval(actualArg)) {
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
    if (
      'noNestingFunctions' in parameterDefinition &&
      parameterDefinition.noNestingFunctions &&
      fnDef.type === argFn.type
    ) {
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
  if (!isColumnItem(actualArg)) {
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
    const columnHit = lookupColumn(actualArg, references);
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

function extractCompatibleSignaturesForFunction(
  fnDef: FunctionDefinition,
  astFunction: ESQLFunction
) {
  return fnDef.signatures.filter((def) => {
    if (def.minParams) {
      return astFunction.args.length >= def.minParams;
    }
    return (
      astFunction.args.length >= def.params.filter(({ optional }) => !optional).length &&
      astFunction.args.length <= def.params.length
    );
  });
}

function removeInlineCasts(arg: ESQLAstItem): ESQLAstItem {
  if (isInlineCastItem(arg)) {
    return removeInlineCasts(arg.value);
  }
  return arg;
}

function validateFunction(
  astFunction: ESQLFunction,
  parentCommand: string,
  parentOption: string | undefined,
  references: ReferenceMaps,
  forceConstantOnly: boolean = false,
  isNested?: boolean
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  if (astFunction.incomplete) {
    return messages;
  }
  const fnDefinition = getFunctionDefinition(astFunction.name)!;

  const isFnSupported = isSupportedFunction(astFunction.name, parentCommand, parentOption);

  if (!isFnSupported.supported) {
    if (isFnSupported.reason === 'unknownFunction') {
      messages.push(errors.unknownFunction(astFunction));
    }
    // for nested functions skip this check and make the nested check fail later on
    if (isFnSupported.reason === 'unsupportedFunction' && !isNested) {
      messages.push(
        parentOption
          ? getMessageFromId({
              messageId: 'unsupportedFunctionForCommandOption',
              values: {
                name: astFunction.name,
                command: parentCommand.toUpperCase(),
                option: parentOption.toUpperCase(),
              },
              locations: astFunction.location,
            })
          : getMessageFromId({
              messageId: 'unsupportedFunctionForCommand',
              values: { name: astFunction.name, command: parentCommand.toUpperCase() },
              locations: astFunction.location,
            })
      );
    }
    if (messages.length) {
      return messages;
    }
  }
  const matchingSignatures = extractCompatibleSignaturesForFunction(fnDefinition, astFunction);
  if (!matchingSignatures.length) {
    const { max, min } = getMaxMinNumberOfParams(fnDefinition);
    if (max === min) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentNumber',
          values: {
            fn: astFunction.name,
            numArgs: max,
            passedArgs: astFunction.args.length,
          },
          locations: astFunction.location,
        })
      );
    } else if (astFunction.args.length > max) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentNumberTooMany',
          values: {
            fn: astFunction.name,
            numArgs: max,
            passedArgs: astFunction.args.length,
            extraArgs: astFunction.args.length - max,
          },
          locations: astFunction.location,
        })
      );
    } else {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentNumberTooFew',
          values: {
            fn: astFunction.name,
            numArgs: min,
            passedArgs: astFunction.args.length,
            missingArgs: min - astFunction.args.length,
          },
          locations: astFunction.location,
        })
      );
    }
  }
  // now perform the same check on all functions args
  for (let i = 0; i < astFunction.args.length; i++) {
    const arg = astFunction.args[i];

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
        const messagesFromArg = validateFunction(
          subArg,
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
          allMatchingArgDefinitionsAreConstantOnly || forceConstantOnly,
          // use the nesting flag for now just for stats and metrics
          // TODO: revisit this part later on to make it more generic
          ['stats', 'inlinestats', 'metrics'].includes(parentCommand)
            ? isNested || !isAssignment(astFunction)
            : false
        );

        if (messagesFromArg.some(({ code }) => code === 'expectedConstant')) {
          const consolidatedMessage = getMessageFromId({
            messageId: 'expectedConstant',
            values: {
              fn: astFunction.name,
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
    const payloads = fnDefinition.validate(astFunction);
    if (payloads.length) {
      messages.push(...payloads);
    }
  }
  // at this point we're sure that at least one signature is matching
  const failingSignatures: ESQLMessage[][] = [];
  for (const signature of matchingSignatures) {
    const failingSignature: ESQLMessage[] = [];
    astFunction.args.forEach((outerArg, index) => {
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
            astFunction,
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
              astFunction.name,
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

  if (failingSignatures.length && failingSignatures.length === matchingSignatures.length) {
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
  isAggFunction(fn) || areFunctionArgsAggClosed(fn);

const areFunctionArgsAggClosed = (fn: ESQLFunction): boolean =>
  fn.args.every((arg) => isLiteralItem(arg) || (isFunctionItem(arg) && isFunctionAggClosed(arg)));

/**
 * Looks for first nested aggregate function in an aggregate function, recursively.
 */
const findNestedAggFunctionInAggFunction = (agg: ESQLFunction): ESQLFunction | undefined => {
  for (const arg of agg.args) {
    if (isFunctionItem(arg)) {
      return isAggFunction(arg) ? arg : findNestedAggFunctionInAggFunction(arg);
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
  if (isAggFunction(fn)) {
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
      messages.push(...validateFunction(aggregate, command.name, undefined, references));

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
    } else if (isColumnItem(aggregate)) {
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
          messages.push(...validateFunction(field, commandName, 'by', referenceMaps));
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
            messages.push(...validateFunction(arg, command.name, option.name, referenceMaps));
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

  const hasCCS = hasCCSSource(source.name);
  if (hasCCS) {
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
  column: ESQLColumn,
  commandName: string,
  references: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  if (commandName === 'row') {
    if (!references.variables.has(column.name)) {
      messages.push(errors.unknownColumn(column));
    }
  } else {
    const columnName = getQuotedColumnName(column);
    if (getColumnExists(column, references)) {
      const commandDef = getCommandDefinition(commandName);
      const columnParamsWithInnerTypes = commandDef.signature.params.filter(
        ({ type, innerType }) => type === 'column' && innerType
      );
      // this should be guaranteed by the columnCheck above
      const columnRef = lookupColumn(column, references)!;

      if (columnParamsWithInnerTypes.length) {
        const hasSomeWrongInnerTypes = columnParamsWithInnerTypes.every(({ innerType }) => {
          if (innerType === 'string' && isStringType(columnRef.type)) return false;
          return innerType !== 'any' && innerType !== columnRef.type;
        });
        if (hasSomeWrongInnerTypes) {
          const supportedTypes = columnParamsWithInnerTypes.map(({ innerType }) => innerType);

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

function validateCommand(command: ESQLCommand, references: ReferenceMaps): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  if (command.incomplete) {
    return messages;
  }
  // do not check the command exists, the grammar is already picking that up
  const commandDef = getCommandDefinition(command.name);

  if (commandDef?.validate) {
    messages.push(...commandDef.validate(command));
  }

  switch (commandDef.name) {
    case 'metrics': {
      const metrics = command as ESQLAstMetricsCommand;
      messages.push(...validateMetricsCommand(metrics, references));
      break;
    }
    default: {
      // Now validate arguments
      for (const commandArg of command.args) {
        const wrappedArg = Array.isArray(commandArg) ? commandArg : [commandArg];
        for (const arg of wrappedArg) {
          if (isFunctionItem(arg)) {
            messages.push(...validateFunction(arg, command.name, undefined, references));
          }

          if (isSettingItem(arg)) {
            messages.push(...validateSetting(arg, commandDef.modes[0], command, references));
          }

          if (isOptionItem(arg)) {
            messages.push(
              ...validateOption(
                arg,
                commandDef.options.find(({ name }) => name === arg.name),
                command,
                references
              )
            );
          }
          if (isColumnItem(arg)) {
            if (command.name === 'stats' || command.name === 'inlinestats') {
              messages.push(errors.unknownAggFunction(arg));
            } else {
              messages.push(...validateColumnForCommand(arg, command.name, references));
            }
          }
          if (isTimeIntervalItem(arg)) {
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
          }
          if (isSourceItem(arg)) {
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

function validateUnsupportedTypeFields(fields: Map<string, ESQLRealField>) {
  const messages: ESQLMessage[] = [];
  for (const field of fields.values()) {
    if (field.type === 'unsupported') {
      // Removed temporarily to supress all these warnings
      // Issue to re-enable in a better way: https://github.com/elastic/kibana/issues/189666
      // messages.push(
      //   getMessageFromId({
      //     messageId: 'unsupportedFieldType',
      //     values: {
      //       field: field.name,
      //     },
      //     locations: { min: 1, max: 1 },
      //   })
      // );
    }
  }
  return messages;
}

export const ignoreErrorsMap: Record<keyof ESQLCallbacks, ErrorTypes[]> = {
  getFieldsFor: ['unknownColumn', 'wrongArgumentType', 'unsupportedFieldType'],
  getSources: ['unknownIndex'],
  getPolicies: ['unknownPolicy'],
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

  const [sources, availableFields, availablePolicies] = await Promise.all([
    // retrieve the list of available sources
    retrieveSources(ast, callbacks),
    // retrieve available fields (if a source command has been defined)
    retrieveFields(queryString, ast, callbacks),
    // retrieve available policies (if an enrich command has been defined)
    retrievePolicies(ast, callbacks),
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
  messages.push(...validateUnsupportedTypeFields(availableFields));

  for (const command of ast) {
    const references: ReferenceMaps = {
      sources,
      fields: availableFields,
      policies: availablePolicies,
      variables,
      query: queryString,
    };
    const commandMessages = validateCommand(command, references);
    messages.push(...commandMessages);
  }

  return {
    errors: [...parsingResult.errors, ...messages.filter(({ type }) => type === 'error')],
    warnings: messages.filter(({ type }) => type === 'warning'),
  };
}
