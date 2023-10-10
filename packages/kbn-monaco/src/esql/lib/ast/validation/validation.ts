/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import capitalize from 'lodash/capitalize';
import { ESQLCustomAutocompleteCallbacks } from '../../autocomplete/types';
import { CommandOptionsDefinition, SignatureArgType } from '../definitions/types';
import {
  areFieldAndVariableTypesCompatible,
  createMapFromList,
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
  isExpression,
  isFunctionItem,
  isLiteralItem,
  isOptionItem,
  isSourceItem,
  isSupportedFunction,
  isTimeIntervalItem,
  printFunctionSignature,
} from '../helpers';
import type {
  ESQLAst,
  ESQLAstItem,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLMessage,
  ESQLSingleAstItem,
  ESQLSource,
} from '../types';
import { getMessageFromId, createWarning } from './errors';
import type {
  ESQLPolicy,
  ESQLRealField,
  ESQLVariable,
  ReferenceMaps,
  ValidationResult,
} from './types';

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
  if (isColumnItem(actualArg)) {
    const columnHit = getColumnHit(actualArg.name, references);
    if (!columnHit) {
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
      // check the type of the column hit
      const typeHit = columnHit.type;
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
      messages.push(createWarning(message, astFunction.location));
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
        // console.log({ astFunction, actualArg });
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
        values: { command: command.name, option: option.name },
        locations: option.location,
      })
    );
    return messages;
  }
  // use dedicate validate fn if provided
  if (optionDef.validate) {
    messages.push(...optionDef.validate(option));
  } else {
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
        }
      }
    });
  }

  return messages;
}

function validateSource(source: ESQLSource, commandName: string, { sources }: ReferenceMaps) {
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
  } else if (!sources.has(source.name)) {
    messages.push(
      getMessageFromId({
        messageId: 'unknownIndex',
        values: { name: source.name },
        locations: source.location,
      })
    );
  }
  return messages;
}

function validateColumnForCommand(
  column: ESQLColumn,
  commandName: string,
  references: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  const commandDef = getCommandDefinition(commandName);
  if (commandName === 'row' && !references.variables.has(column.name)) {
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
  if (
    ['keep', 'drop', 'eval', 'stats', 'rename', 'dissect', 'grok', 'sort'].includes(commandName)
  ) {
    const columnRef = getColumnHit(column.name, references);
    if (columnRef) {
      const columnParamsWithInnerTypes = commandDef.signature.params.filter(
        ({ innerType }) => innerType
      );

      if (
        columnParamsWithInnerTypes.every(({ innerType }) => {
          return innerType !== columnRef.type;
        }) &&
        columnParamsWithInnerTypes.length
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
              column: column.name,
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
  // do not check the command exists, the grammar is already picking that up
  const commandDef = getCommandDefinition(command.name);
  if (command.incomplete) {
    return messages;
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
        messages.push(...validateColumnForCommand(arg, command.name, references));
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

function getAssignRightHandSideType(item: ESQLAstItem, fields: Map<string, ESQLRealField>) {
  if (Array.isArray(item)) {
    const firstArg = item[0];
    if (Array.isArray(firstArg) || !firstArg) {
      return;
    }
    if (firstArg.type === 'literal') {
      return firstArg.literalType;
    }
    if (isColumnItem(firstArg)) {
      const field = fields.get(firstArg.name);
      if (field) {
        return field.type;
      }
    }
    if (isFunctionItem(firstArg)) {
      const fnDefinition = getFunctionDefinition(firstArg.name);
      return fnDefinition?.signatures[0].returnType;
    }
  }
}

function addToVariableOccurrencies(variables: Map<string, ESQLVariable[]>, instance: ESQLVariable) {
  if (!variables.has(instance.name)) {
    variables.set(instance.name, []);
  }
  const variablesOccurrencies = variables.get(instance.name)!;
  variablesOccurrencies.push(instance);
}

function replaceTrimmedVariable(
  variables: Map<string, ESQLVariable[]>,
  newRef: ESQLColumn,
  oldRef: ESQLVariable[]
) {
  // now replace the existing trimmed version with this original one
  addToVariableOccurrencies(variables, {
    name: newRef.name,
    type: oldRef[0].type,
    location: newRef.location,
  });
  // remove the trimmed one
  variables.delete(oldRef[0].name);
}

function collectVariables(
  commands: ESQLCommand[],
  fields: Map<string, ESQLRealField>
): Map<string, ESQLVariable[]> {
  const variables = new Map<string, ESQLVariable[]>();
  for (const command of commands) {
    if (['row', 'eval', 'stats'].includes(command.name)) {
      const assignOperations = command.args.filter(isAssignment);
      for (const assignOperation of assignOperations) {
        if (isColumnItem(assignOperation.args[0])) {
          const rightHandSideArgType = getAssignRightHandSideType(assignOperation.args[1], fields);
          addToVariableOccurrencies(variables, {
            name: assignOperation.args[0].name,
            type: rightHandSideArgType || 'number' /* fallback to number */,
            location: assignOperation.args[0].location,
          });
        }
      }
      const expressionOperations = command.args.filter(isExpression);
      for (const expressionOperation of expressionOperations) {
        // just save the entire expression as variable string
        const expressionType = 'number';
        addToVariableOccurrencies(variables, {
          name: expressionOperation.text,
          type: expressionType,
          location: expressionOperation.location,
        });
      }
    }
    if (command.name === 'rename') {
      const asOperations = command.args.filter(
        (arg) => isOptionItem(arg) && arg.name === 'as'
      ) as ESQLFunction[];
      for (const asOperation of asOperations) {
        const [oldArg, newArg] = asOperation.args;
        if (isColumnItem(oldArg) && isColumnItem(newArg)) {
          const newVariable: ESQLVariable = {
            name: newArg.name,
            type: 'number' /* fallback to number */,
            location: newArg.location,
          };
          addToVariableOccurrencies(variables, newVariable);
          // Now workout the exact type
          // it can be a rename of another variable as well
          let oldRef = fields.get(oldArg.name) || variables.get(oldArg.name);
          if (oldRef) {
            newVariable.type = Array.isArray(oldRef) ? oldRef[0].type : oldRef.type;
          } else if (oldArg.quoted) {
            // a last attempt in case the user tried to rename an expression:
            // trim every space and try a new hit
            const expressionTrimmedRef = oldArg.text.replace(/\s/g, '');
            oldRef = variables.get(expressionTrimmedRef);
            if (oldRef) {
              newVariable.type = oldRef[0].type;
              replaceTrimmedVariable(variables, oldArg, oldRef);
            }
          }
        }
      }
    }
  }
  return variables;
}

async function retrieveFields(
  commands: ESQLCommand[],
  callbacks?: ESQLCustomAutocompleteCallbacks
): Promise<Map<string, ESQLRealField>> {
  if (!callbacks || commands.length < 1) {
    return new Map();
  }
  if (commands[0].name === 'row') {
    return new Map();
  }
  const fields = (await callbacks.getFields?.({ sourceOnly: true })) || [];
  return createMapFromList(fields);
}

async function retrievePolicies(
  commands: ESQLCommand[],
  callbacks?: ESQLCustomAutocompleteCallbacks
): Promise<Map<string, ESQLPolicy>> {
  if (!callbacks || commands.every(({ name }) => name !== 'enrich')) {
    return new Map();
  }
  const policies = (await callbacks.getPolicies?.()) || [];
  return createMapFromList(policies);
}

async function retrieveSources(callbacks?: ESQLCustomAutocompleteCallbacks): Promise<Set<string>> {
  if (!callbacks) {
    return new Set();
  }
  const sources = (await callbacks?.getSources?.()) || [];
  return new Set(sources);
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

/**
 * This function will perform an high level validation of the
 * query AST. An initial syntax validation is already performed by the parser
 * while here it can detect things like function names, types correctness and potential warnings
 * @param ast A valid AST data structure
 */
export async function validateAst(
  ast: ESQLAst,
  callbacks?: ESQLCustomAutocompleteCallbacks
): Promise<ValidationResult> {
  const messages: ESQLMessage[] = [];

  const [sources, availableFields, availablePolicies] = await Promise.all([
    // retrieve the list of available sources
    retrieveSources(callbacks),
    // retrieve available fields (if a source command has been defined)
    retrieveFields(ast, callbacks),
    // retrieve available policies (if an enrich command has been defined)
    retrievePolicies(ast, callbacks),
  ]);

  const variables = collectVariables(ast, availableFields);
  // console.log({ ast, variables });

  // notify if the user is rewriting a column as variable with another type
  messages.push(...validateFieldsShadowing(availableFields, variables));

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
    errors: messages.filter(({ type }) => type === 'error'),
    warnings: messages.filter(({ type }) => type === 'warning'),
  };
}
