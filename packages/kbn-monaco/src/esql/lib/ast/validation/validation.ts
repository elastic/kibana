/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  getCommandDefinition,
  getFunctionDefinition,
  isEqualType,
  isSupportedFunction,
} from '../helpers';
import type {
  ESQLAst,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLMessage,
  ESQLSingleAstItem,
} from '../types';
import { getMessageFromId, createWarning } from './errors';
import type { ValidationResult } from './types';

function validateFunction(astFunction: ESQLFunction, parentCommand: string): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

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
          values: { name: astFunction.name, command: parentCommand },
          locations: astFunction.location,
        })
      );
    }
    return messages;
  }
  const fnDefinition = getFunctionDefinition(astFunction.name)!;
  const matchingSignatures = fnDefinition.signatures.filter((def) => {
    return (
      def.params.filter(({ optional }) => !optional).length === astFunction.args.length ||
      (def.infiniteParams && astFunction.args.length > 0)
    );
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
    if (!Array.isArray(arg)) {
      if (arg.type === 'function') {
        messages.push(...validateFunction(arg, parentCommand));
      }
    } else {
      for (const subArg of arg) {
        if (!Array.isArray(subArg) && subArg.type === 'function') {
          messages.push(...validateFunction(subArg, parentCommand));
        }
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
      const actualArg = astFunction.args[index]!;
      const argDefTypes = Array.isArray(argDef.type) ? argDef.type : [argDef.type];
      if (!Array.isArray(actualArg)) {
        if (actualArg.type === 'literal') {
          if (!isEqualType(actualArg, argDefTypes, parentCommand)) {
            if (actualArg.literalType === 'string') {
              failingSignature.push(
                getMessageFromId({
                  messageId: 'unknownColumn',
                  values: {
                    value: actualArg.value,
                  },
                  locations: actualArg.location,
                })
              );
            } else {
              failingSignature.push(
                getMessageFromId({
                  messageId: 'wrongArgumentType',
                  values: {
                    name: astFunction.name,
                    argType: argDefTypes.join(', '),
                    value: actualArg.value,
                    givenType: actualArg.literalType,
                  },
                  locations: actualArg.location,
                })
              );
            }
          }
        }
        if (
          actualArg.type === 'function' &&
          // no need to check the reason here, it is checked already above
          isSupportedFunction(actualArg.name, parentCommand).supported
        ) {
          const argFn = getFunctionDefinition(actualArg.name)!;
          if (!isEqualType(actualArg, argDefTypes, parentCommand)) {
            failingSignature.push(
              getMessageFromId({
                messageId: 'wrongArgumentType',
                values: {
                  name: astFunction.name,
                  argType: argDefTypes.join(', '),
                  value: actualArg.name,
                  givenType: argFn.signatures[0].returnType,
                },
                locations: actualArg.location,
              })
            );
          } else {
            if (argDef.noNestingFunctions) {
              failingSignature.push(
                getMessageFromId({
                  messageId: 'noNestedArgumentSupport',
                  values: { name: actualArg.text, argType: argFn.signatures[0].returnType },
                  locations: actualArg.location,
                })
              );
            }
          }
        }
      }
    });
    if (failingSignature.length) {
      failingSignatures.push(failingSignature);
    }
  }
  if (failingSignatures.length && failingSignatures.length === matchingSignatures.length) {
    messages.push(...failingSignatures[0]);
  }
  return messages;
}

function validateOptions(option: ESQLCommandOption, commandName: string): ESQLMessage[] {
  return [];
}

function validateCommand(command: ESQLCommand): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  // do not check the command exists, the grammar is already picking that up
  const commandDef = getCommandDefinition(command.name);

  // Now validate arguments
  for (const arg of command.args) {
    if (!Array.isArray(arg)) {
      if (arg.type === 'function') {
        messages.push(...validateFunction(arg, command.name));
      }
      if (arg.type === 'option') {
        messages.push(...validateOptions(arg, command.name));
      }
      if (arg.type === 'column') {
        // all ok - will validate later on
      }
    } else {
      // throw Error('Unknown command arg');
    }
  }
  // check the mandatory options are passed
  if (commandDef.options.some(({ optional }) => !optional)) {
    const mandatoryOptions = commandDef.options.filter(({ optional }) => !optional);
    const passedOptions = command.args.filter(
      (arg) => !Array.isArray(arg) && arg.type === 'option'
    ) as ESQLCommandOption[];
    if (
      mandatoryOptions.some(
        (optionDef) => !passedOptions.find(({ name }) => optionDef.name === name)
      )
    ) {
      messages.push(
        createWarning(
          i18n.translate('monaco.esql.validation.missingOptionWarning', {
            defaultMessage: 'Missing option in command {command}',
            values: {
              command: command.name,
            },
          }),
          command.location
        )
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
export function validateAst(ast: ESQLAst): ValidationResult {
  const messages: ESQLMessage[] = [];

  for (const command of ast) {
    messages.push(...validateCommand(command));
  }
  return {
    errors: messages.filter(({ type }) => type === 'error'),
    warnings: messages.filter(({ type }) => type === 'warning'),
  };
}
