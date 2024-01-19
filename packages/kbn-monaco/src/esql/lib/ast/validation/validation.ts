/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uniqBy from 'lodash/uniqBy';
import capitalize from 'lodash/capitalize';
import { CommandOptionsDefinition, SignatureArgType } from '../definitions/types';
import {
  areFieldAndVariableTypesCompatible,
  extractSingleType,
  getAllArrayTypes,
  getAllArrayValues,
  getColumnHit,
  getCommandDefinition,
  getFunctionDefinition,
  isArrayType,
  isAssignment,
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
} from '../shared/helpers';
import { collectVariables } from '../shared/variables';
import type {
  AstProviderFn,
  ESQLAstItem,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLMessage,
  ESQLSingleAstItem,
  ESQLSource,
} from '../types';
import { getMessageFromId, createMessage } from './errors';
import type { ESQLRealField, ESQLVariable, ReferenceMaps, ValidationResult } from './types';
import type { ESQLCallbacks } from '../shared/types';
import {
  retrieveSources,
  retrieveFields,
  retrievePolicies,
  retrievePoliciesFields,
} from './resources';

function validateFunctionLiteralArg(
  astFunction: ESQLFunction,
  actualArg: ESQLAstItem,
  argDef: SignatureArgType,
  references: ReferenceMaps,
  parentCommand: string
) {
  const messages: ESQLMessage[] = [];
  if (isLiteralItem(actualArg)) {
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
    const argFn = getFunctionDefinition(actualArg.name)!;
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
    } else {
      if ('noNestingFunctions' in argDef && argDef.noNestingFunctions) {
        messages.push(
          getMessageFromId({
            messageId: 'noNestedArgumentSupport',
            values: { name: actualArg.text, argType: argFn.signatures[0].returnType },
            locations: actualArg.location,
          })
        );
      }
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
  if (isColumnItem(actualArg) && actualArg.name) {
    const { hit: columnCheck, nameHit } = columnExists(actualArg, references);
    if (!columnCheck) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownColumn',
          values: {
            name: actualArg.name,
          },
          locations: actualArg.location,
        })
      );
    } else {
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
        // guaranteed by the check above
        const columnHit = getColumnHit(nameHit!, references);
        // check the type of the column hit
        const typeHit = columnHit!.type;
        if (!isEqualType(actualArg, argDef, references, parentCommand)) {
          messages.push(
            getMessageFromId({
              messageId: 'wrongArgumentType',
              values: {
                name: astFunction.name,
                argType: argDef.type,
                value: actualArg.name,
                givenType: typeHit,
              },
              locations: actualArg.location,
            })
          );
        }
      }
    }
  }
  return messages;
}

function validateFunction(
  astFunction: ESQLFunction,
  parentCommand: string,
  references: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  if (astFunction.incomplete) {
    return messages;
  }

  const isFnSupported = isSupportedFunction(astFunction.name, parentCommand);

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
    if (isFnSupported.reason === 'unsupportedFunction') {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedFunction',
          values: { name: astFunction.name, command: capitalize(parentCommand) },
          locations: astFunction.location,
        })
      );
    }
    return messages;
  }
  const fnDefinition = getFunctionDefinition(astFunction.name)!;
  const matchingSignatures = fnDefinition.signatures.filter((def) => {
    if (def.infiniteParams && astFunction.args.length > 0) {
      return true;
    }
    if (def.minParams && astFunction.args.length >= def.minParams) {
      return true;
    }
    if (astFunction.args.length === def.params.length) {
      return true;
    }
    return astFunction.args.length >= def.params.filter(({ optional }) => !optional).length;
  });
  if (!matchingSignatures.length) {
    const numArgs = fnDefinition.signatures[0].params.filter(({ optional }) => !optional).length;
    messages.push(
      getMessageFromId({
        messageId: 'wrongArgumentNumber',
        values: {
          fn: astFunction.name,
          numArgs,
          passedArgs: astFunction.args.length,
        },
        locations: astFunction.location,
      })
    );
  }
  // now perform the same check on all functions args
  for (const arg of astFunction.args) {
    const wrappedArray = Array.isArray(arg) ? arg : [arg];
    for (const subArg of wrappedArray) {
      if (isFunctionItem(subArg)) {
        messages.push(...validateFunction(subArg, parentCommand, references));
      }
    }
  }
  // check if the definition has some warning to show:
  if (fnDefinition.warning) {
    const message = fnDefinition.warning(
      ...(astFunction.args.filter((arg) => !Array.isArray(arg)) as ESQLSingleAstItem[])
    );
    if (message) {
      messages.push(createMessage('warning', message, astFunction.location));
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
                { ...argDef, type: extractedType },
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
          return validateFn(astFunction, actualArg, argDef, references, parentCommand);
        });
        failingSignature.push(...argValidationMessages);

        if (isSourceItem(actualArg)) {
          // something went wrong with the AST translation
          throw new Error('Source should not allowed as function argument');
        }
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
        values: { command: command.name, option: option.name },
        locations: option.location,
      })
    );
    return messages;
  }
  // use dedicate validate fn if provided
  if (optionDef.validate) {
    messages.push(...optionDef.validate(option));
  }
  if (!optionDef.skipCommonValidation) {
    option.args.forEach((arg, index) => {
      if (!Array.isArray(arg)) {
        if (!optionDef.signature.multipleParams) {
          const argDef = optionDef.signature.params[index];
          if (!isEqualType(arg, argDef, referenceMaps, command.name)) {
            const value = 'value' in arg ? arg.value : arg.name;
            messages.push(
              getMessageFromId({
                messageId: 'wrongArgumentType',
                values: {
                  name: option.name,
                  argType: argDef.type,
                  value,
                  givenType: arg.type,
                },
                locations: arg.location,
              })
            );
          }
          if (isColumnItem(arg)) {
            messages.push(...validateColumnForCommand(arg, command.name, referenceMaps));
          }
        } else {
          const argDef = optionDef.signature.params[0];
          if (!isEqualType(arg, argDef, referenceMaps, command.name)) {
            const value = 'value' in arg ? arg.value : arg.name;
            messages.push(
              getMessageFromId({
                messageId: 'wrongArgumentType',
                values: {
                  name: argDef.name,
                  argType: argDef.type,
                  value,
                  givenType: arg.type,
                },
                locations: arg.location,
              })
            );
          }
          if (isColumnItem(arg)) {
            messages.push(...validateColumnForCommand(arg, command.name, referenceMaps));
          }
          if (isFunctionItem(arg) && isAssignment(arg)) {
            messages.push(...validateFunction(arg, command.name, referenceMaps));
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
  if (commandDef.signature.params.every(({ type }) => type !== source.type)) {
    const firstArg = commandDef.signature.params[0];
    messages.push(
      getMessageFromId({
        messageId: 'wrongArgumentType',
        values: {
          name: firstArg.name,
          argType: firstArg.type,
          value: source.name,
          givenType: source.type,
        },
        locations: source.location,
      })
    );
  } else {
    // give up on validate if CCS for now
    const hasCCS = hasCCSSource(source.name);
    if (!hasCCS) {
      const isWildcardAndNotSupported =
        hasWildcard(source.name) && !commandDef.signature.params.some(({ wildcards }) => wildcards);
      if (isWildcardAndNotSupported) {
        messages.push(
          getMessageFromId({
            messageId: 'wildcardNotSupportedForCommand',
            values: { command: commandName, value: source.name },
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
  }
  return messages;
}

function validateColumnForCommand(
  column: ESQLColumn,
  commandName: string,
  references: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  if (['from', 'show', 'limit'].includes(commandName)) {
    return messages;
  }
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

      if (columnParamsWithInnerTypes.length) {
        // this should be guaranteed by the columnCheck above
        const columnRef = getColumnHit(nameHit, references)!;
        if (
          columnParamsWithInnerTypes.every(({ innerType }) => {
            return innerType !== columnRef.type;
          })
        ) {
          const supportedTypes = columnParamsWithInnerTypes.map(({ innerType }) => innerType);

          messages.push(
            getMessageFromId({
              messageId: 'unsupportedColumnTypeForCommand',
              values: {
                command: capitalize(commandName),
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
        !commandDef.signature.params.some(({ type, wildcards }) => type === 'column' && wildcards)
      ) {
        messages.push(
          getMessageFromId({
            messageId: 'wildcardNotSupportedForCommand',
            values: {
              command: commandName,
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
        messages.push(...validateFunction(arg, command.name, references));
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
                command: capitalize(command.name),
                value: (arg as ESQLSingleAstItem).name,
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
              command: capitalize(command.name),
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

/**
 * This function will perform an high level validation of the
 * query AST. An initial syntax validation is already performed by the parser
 * while here it can detect things like function names, types correctness and potential warnings
 * @param ast A valid AST data structure
 */
export async function validateAst(
  queryString: string,
  astProvider: AstProviderFn,
  callbacks?: ESQLCallbacks
): Promise<ValidationResult> {
  const messages: ESQLMessage[] = [];

  const { ast, errors } = await astProvider(queryString);

  const [sources, availableFields, availablePolicies] = await Promise.all([
    // retrieve the list of available sources
    retrieveSources(ast, callbacks),
    // retrieve available fields (if a source command has been defined)
    retrieveFields(queryString, ast, callbacks),
    // retrieve available policies (if an enrich command has been defined)
    retrievePolicies(ast, callbacks),
  ]);

  if (availablePolicies.size && ast.filter(({ name }) => name === 'enrich')) {
    const fieldsFromPoliciesMap = await retrievePoliciesFields(ast, availablePolicies, callbacks);
    fieldsFromPoliciesMap.forEach((value, key) => availableFields.set(key, value));
  }

  const variables = collectVariables(ast, availableFields);
  // notify if the user is rewriting a column as variable with another type
  messages.push(...validateFieldsShadowing(availableFields, variables));
  messages.push(...validateUnsupportedTypeFields(availableFields));

  for (const command of ast) {
    const commandMessages = validateCommand(command, {
      sources,
      fields: availableFields,
      policies: availablePolicies,
      variables,
    });
    messages.push(...commandMessages);
  }
  return {
    errors: [...errors, ...messages.filter(({ type }) => type === 'error')],
    warnings: messages.filter(({ type }) => type === 'warning'),
  };
}
