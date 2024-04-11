/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uniqBy from 'lodash/uniqBy';
import type {
  AstProviderFn,
  ESQLAstItem,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandMode,
  ESQLCommandOption,
  ESQLFunction,
  ESQLMessage,
  ESQLSingleAstItem,
  ESQLSource,
} from '@kbn/esql-ast';
import {
  CommandModeDefinition,
  CommandOptionsDefinition,
  FunctionArgSignature,
  FunctionDefinition,
  SignatureArgType,
} from '../definitions/types';
import {
  areFieldAndVariableTypesCompatible,
  extractSingleType,
  getAllArrayTypes,
  getAllArrayValues,
  getColumnHit,
  getCommandDefinition,
  getFunctionDefinition,
  isArrayType,
  isColumnItem,
  isEqualType,
  isFunctionItem,
  isLiteralItem,
  isOptionItem,
  isSourceItem,
  isSupportedFunction,
  isTimeIntervalItem,
  inKnownTimeInterval,
  printFunctionSignature,
  sourceExists,
  columnExists,
  hasWildcard,
  hasCCSSource,
  isSettingItem,
  isAssignment,
  isVariable,
  isValidLiteralOption,
} from '../shared/helpers';
import { collectVariables } from '../shared/variables';
import { getMessageFromId, getUnknownTypeLabel } from './errors';
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
  retrieveMetadataFields,
  retrieveFieldsFromStringSources,
} from './resources';

function validateFunctionLiteralArg(
  astFunction: ESQLFunction,
  actualArg: ESQLAstItem,
  argDef: FunctionArgSignature,
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

    if (!isEqualType(actualArg, argDef, references, parentCommand)) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentType',
          values: {
            name: astFunction.name,
            argType: argDef.type,
            value: actualArg.value,
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
      if (!isEqualType(actualArg, argDef, references, parentCommand)) {
        messages.push(
          getMessageFromId({
            messageId: 'wrongArgumentType',
            values: {
              name: astFunction.name,
              argType: argDef.type,
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

function validateNestedFunctionArg(
  astFunction: ESQLFunction,
  actualArg: ESQLAstItem,
  argDef: SignatureArgType,
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
    if ('noNestingFunctions' in argDef && argDef.noNestingFunctions && fnDef.type === argFn.type) {
      messages.push(
        getMessageFromId({
          messageId: 'noNestedArgumentSupport',
          values: { name: actualArg.text, argType: argFn.signatures[0].returnType },
          locations: actualArg.location,
        })
      );
    }
    if (!isEqualType(actualArg, argDef, references, parentCommand)) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentType',
          values: {
            name: astFunction.name,
            argType: argDef.type,
            value: printFunctionSignature(actualArg) || actualArg.name,
            givenType: argFn.signatures[0].returnType,
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
  argDef: SignatureArgType,
  references: ReferenceMaps,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (isColumnItem(actualArg)) {
    if (actualArg.name) {
      const { hit: columnCheck, nameHit } = columnExists(actualArg, references);
      if (!columnCheck) {
        if (argDef.constantOnly) {
          messages.push(
            getMessageFromId({
              messageId: 'expectedConstant',
              values: {
                fn: astFunction.name,
                given: getUnknownTypeLabel(),
              },
              locations: actualArg.location,
            })
          );
        } else {
          messages.push(
            getMessageFromId({
              messageId: 'unknownColumn',
              values: {
                name: actualArg.name,
              },
              locations: actualArg.location,
            })
          );
        }
      } else {
        if (argDef.constantOnly) {
          messages.push(
            getMessageFromId({
              messageId: 'expectedConstant',
              values: {
                fn: astFunction.name,
                given: actualArg.name,
              },
              locations: actualArg.location,
            })
          );
        }
        if (actualArg.name === '*') {
          // if function does not support wildcards return a specific error
          if (!('supportsWildcard' in argDef) || !argDef.supportsWildcard) {
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
          // do not validate any further for now, only count() accepts wildcard as args...
        } else {
          if (!isEqualType(actualArg, argDef, references, parentCommand, nameHit)) {
            // guaranteed by the check above
            const columnHit = getColumnHit(nameHit!, references);
            messages.push(
              getMessageFromId({
                messageId: 'wrongArgumentType',
                values: {
                  name: astFunction.name,
                  argType: argDef.type,
                  value: actualArg.name,
                  givenType: columnHit!.type,
                },
                locations: actualArg.location,
              })
            );
          }
        }
      }
    }
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
      messages.push(
        getMessageFromId({
          messageId: 'unknownFunction',
          values: {
            name: astFunction.name,
          },
          locations: astFunction.location,
        })
      );
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
    const refSignature = fnDefinition.signatures[0];
    const numArgs =
      refSignature.minParams ?? refSignature.params.filter(({ optional }) => !optional).length;
    if (
      !refSignature.minParams &&
      refSignature.params.filter(({ optional }) => !optional).length === refSignature.params.length
    ) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentNumber',
          values: {
            fn: astFunction.name,
            numArgs:
              refSignature.minParams ??
              refSignature.params.filter(({ optional }) => !optional).length,
            passedArgs: astFunction.args.length,
          },
          locations: astFunction.location,
        })
      );
    } else if (Math.max(astFunction.args.length - refSignature.params.length, 0) > 0) {
      messages.push(
        getMessageFromId({
          messageId: 'wrongArgumentNumberTooMany',
          values: {
            fn: astFunction.name,
            numArgs: refSignature.params.length,
            passedArgs: astFunction.args.length,
            extraArgs: Math.max(astFunction.args.length - refSignature.params.length, 0),
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
            numArgs,
            passedArgs: astFunction.args.length,
            missingArgs: Math.max(numArgs - astFunction.args.length, 0),
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
    for (const subArg of wrappedArray) {
      if (isFunctionItem(subArg)) {
        const messagesFromArg = validateFunction(
          subArg,
          parentCommand,
          parentOption,
          references,
          /**
           * The constantOnly constraint needs to be enforced for
           * arguments that are functions as well, regardless of
           * whether the definition for the sub function's arguments includes
           * the constantOnly flag.
           *
           * Example:
           * bucket(@timestamp, abs(bytes), "", "")
           *
           * In the above example, the abs function is not defined with the constantOnly flag,
           * but the second parameter in bucket _is_ defined with the constantOnly flag.
           *
           * Because of this, the abs function's arguments inherit the constraint and each
           * should be validated as if each were constantOnly.
           */
          allMatchingArgDefinitionsAreConstantOnly || forceConstantOnly,
          // use the nesting flag for now just for stats
          // TODO: revisit this part later on to make it more generic
          parentCommand === 'stats' ? isNested || !isAssignment(astFunction) : false
        );
        messages.push(...messagesFromArg);
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
    signature.params.forEach((argDef, index) => {
      const outerArg = astFunction.args[index]!;
      if (!outerArg && argDef.optional) {
        // that's ok, just skip it
        // the else case is already catched with the argument counts check
        // few lines above
        return;
      }
      // if the arg is an array of values, check each element
      if (Array.isArray(outerArg) && isArrayType(argDef.type)) {
        const extractedType = extractSingleType(argDef.type);
        const everyArgInListMessages = outerArg
          .map((arg) => {
            return [
              validateFunctionLiteralArg,
              validateNestedFunctionArg,
              validateFunctionColumnArg,
            ].flatMap((validateFn) => {
              return validateFn(
                astFunction,
                arg,
                {
                  ...argDef,
                  constantOnly: forceConstantOnly || argDef.constantOnly,
                  type: extractedType,
                },
                references,
                parentCommand
              );
            });
          })
          .filter((ms) => ms.length);
        if (everyArgInListMessages.length) {
          failingSignature.push(
            getMessageFromId({
              messageId: 'wrongArgumentType',
              values: {
                name: astFunction.name,
                argType: argDef.type,
                value: `(${getAllArrayValues(outerArg).join(', ')})`,
                givenType: `(${getAllArrayTypes(outerArg, parentCommand, references).join(', ')})`,
              },
              locations: {
                min: (outerArg[0] as ESQLSingleAstItem).location.min,
                max: (outerArg[outerArg.length - 1] as ESQLSingleAstItem).location.max,
              },
            })
          );
        }
        return;
      }
      const wrappedArg = Array.isArray(outerArg) ? outerArg : [outerArg];
      for (const actualArg of wrappedArg) {
        const argValidationMessages = [
          validateFunctionLiteralArg,
          validateNestedFunctionArg,
          validateFunctionColumnArg,
        ].flatMap((validateFn) => {
          return validateFn(
            astFunction,
            actualArg,
            { ...argDef, constantOnly: forceConstantOnly || argDef.constantOnly },
            references,
            parentCommand
          );
        });
        failingSignature.push(...argValidationMessages);
      }
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
    messages.push(...optionDef.validate(option, command, referenceMaps.metadataFields));
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
  const commandDef = getCommandDefinition(commandName);
  // give up on validate if CCS for now
  const hasCCS = hasCCSSource(source.name);
  if (!hasCCS) {
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
      messages.push(
        getMessageFromId({
          messageId: 'unknownColumn',
          values: {
            name: column.name,
          },
          locations: column.location,
        })
      );
    }
  } else {
    const { hit: columnCheck, nameHit } = columnExists(column, references);
    if (columnCheck && nameHit) {
      const commandDef = getCommandDefinition(commandName);
      const columnParamsWithInnerTypes = commandDef.signature.params.filter(
        ({ type, innerType }) => type === 'column' && innerType
      );
      // this should be guaranteed by the columnCheck above
      const columnRef = getColumnHit(nameHit, references)!;

      if (columnParamsWithInnerTypes.length) {
        const hasSomeWrongInnerTypes = columnParamsWithInnerTypes.every(({ innerType }) => {
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
                column: nameHit,
              },
              locations: column.location,
            })
          );
        }
      }
      if (
        hasWildcard(nameHit) &&
        !isVariable(columnRef) &&
        !commandDef.signature.params.some(({ type, wildcards }) => type === 'column' && wildcards)
      ) {
        messages.push(
          getMessageFromId({
            messageId: 'wildcardNotSupportedForCommand',
            values: {
              command: commandName.toUpperCase(),
              value: nameHit,
            },
            locations: column.location,
          })
        );
      }
    } else {
      if (column.name) {
        messages.push(
          getMessageFromId({
            messageId: 'unknownColumn',
            values: {
              name: column.name,
            },
            locations: column.location,
          })
        );
      }
    }
  }
  return messages;
}

function validateCommand(command: ESQLCommand, references: ReferenceMaps): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  if (command.incomplete) {
    return messages;
  }
  // do not check the command exists, the grammar is already picking that up
  const commandDef = getCommandDefinition(command.name);

  if (commandDef.validate) {
    messages.push(...commandDef.validate(command));
  }

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
        if (command.name === 'stats') {
          messages.push(
            getMessageFromId({
              messageId: 'unknownAggregateFunction',
              values: {
                value: (arg as ESQLSingleAstItem).name,
                type: 'FieldAttribute',
              },
              locations: (arg as ESQLSingleAstItem).location,
            })
          );
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
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedFieldType',
          values: {
            field: field.name,
          },
          locations: { min: 1, max: 1 },
        })
      );
    }
  }
  return messages;
}

export const ignoreErrorsMap: Record<keyof ESQLCallbacks, ErrorTypes[]> = {
  getFieldsFor: ['unknownColumn', 'wrongArgumentType', 'unsupportedFieldType'],
  getSources: ['unknownIndex'],
  getPolicies: ['unknownPolicy'],
  getMetaFields: ['unknownMetadataField'],
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
  const { errors, warnings } = result;
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
  const filteredErrors = errors
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
  return { errors: filteredErrors, warnings };
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

  const { ast, errors } = await astProvider(queryString);

  const [sources, availableFields, availablePolicies, availableMetadataFields] = await Promise.all([
    // retrieve the list of available sources
    retrieveSources(ast, callbacks),
    // retrieve available fields (if a source command has been defined)
    retrieveFields(queryString, ast, callbacks),
    // retrieve available policies (if an enrich command has been defined)
    retrievePolicies(ast, callbacks),
    // retrieve available metadata fields
    retrieveMetadataFields(callbacks),
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
    const commandMessages = validateCommand(command, {
      sources,
      fields: availableFields,
      policies: availablePolicies,
      variables,
      metadataFields: availableMetadataFields,
      query: queryString,
    });
    messages.push(...commandMessages);
  }

  return {
    errors: [...errors, ...messages.filter(({ type }) => type === 'error')],
    warnings: messages.filter(({ type }) => type === 'warning'),
  };
}
