/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getFunctionDefinition, isEqualType, isSupportedFunction } from './helpers';
import { ESQLAst, ESQLFunction, ESQLLocation, ESQLMessage, ESQLSingleAstItem } from './types';

interface ValidationErrors {
  wrongArgumentType: {
    message: string;
    type: {
      name: string;
      argType: string;
      value: string | number | Date;
      givenType: string;
    };
  };
  wrongArgumentNumber: {
    message: string;
    type: { fn: string; numArgs: number; passedArgs: number };
  };
  unknownColumn: {
    message: string;
    type: { value: string | number };
  };
  unknownFunction: {
    message: string;
    type: { name: string };
  };
}

type ErrorTypes = keyof ValidationErrors;
type ErrorValues<K extends ErrorTypes> = ValidationErrors[K]['type'];

function getMessageFromId<K extends ErrorTypes>({
  messageId,
  values,
  locations,
}: {
  messageId: K;
  values: ErrorValues<K>;
  locations?: ESQLLocation;
}): ESQLMessage {
  let message: string = '';
  // Use a less strict type instead of doing a typecast on each message type
  //   const out = values as unknown as Record<string, string>;
  switch (messageId) {
    case 'wrongArgumentType':
      message = i18n.translate('monaco.esql.validation.wrongArgumentType', {
        defaultMessage:
          'argument of [{name}] must be [{argType}], found value [{value}] type [{givenType}]',
        values,
      });
      break;
    case 'unknownColumn':
      message = i18n.translate('monaco.esql.validation.wrongArgumentColumnType', {
        defaultMessage: 'unknown column [{arg}]',
        values,
      });
      break;
    case 'unknownFunction':
      message = i18n.translate('monaco.esql.validation.missingFunction', {
        defaultMessage: 'Unknown function [{name}]',
        values,
      });
      break;
    case 'wrongArgumentNumber':
      message = i18n.translate('monaco.esql.validation.wrongArgumentNumber', {
        defaultMessage:
          'error building [{fn}]: expects exactly {numArgs, plural, one {one argument} other {{numArgs} arguments}}, passed {passedArgs} instead.',
        values,
      });
  }
  return createMessage('error', message, locations);
}

function createWarning(message: string, location?: ESQLLocation) {
  return createMessage('warning', message, location);
}

function createMessage(type: 'error' | 'warning', message: string, location?: ESQLLocation) {
  return {
    type,
    text: message,
    location,
  };
}

function validateFunction(astFunction: ESQLFunction, parentCommand: string) {
  const errors: ESQLMessage[] = [];
  const warnings: ESQLMessage[] = [];
  if (!isSupportedFunction(astFunction.name, parentCommand)) {
    errors.push(
      getMessageFromId({
        messageId: 'unknownFunction',
        values: {
          name: astFunction.name,
        },
        locations: astFunction.location,
      })
    );
    return { errors, warnings };
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
    errors.push(
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
        const payload = validateFunction(arg, parentCommand);
        if (payload.errors) {
          errors.push(...payload.errors);
        }
        if (payload.warnings) {
          warnings.push(...payload.warnings);
        }
      }
    } else {
      for (const subArg of arg) {
        if (!Array.isArray(subArg) && subArg.type === 'function') {
          const payload = validateFunction(subArg, parentCommand);
          if (payload.errors) {
            errors.push(...payload.errors);
          }
          if (payload.warnings) {
            warnings.push(...payload.warnings);
          }
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
      warnings.push(createWarning(message, astFunction.location));
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
        if (actualArg.type === 'function' && isSupportedFunction(actualArg.name, parentCommand)) {
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
          }
        }
      }
    });
    if (failingSignature.length) {
      failingSignatures.push(failingSignature);
    }
  }
  if (failingSignatures.length && failingSignatures.length === matchingSignatures.length) {
    errors.push(...failingSignatures[0]);
  }
  return { errors, warnings };
}

/**
 * This function will perform an high level validation of the
 * query AST. An initial syntax validation is already performed by the parser
 * while here it can detect things like function names, types correctness and potential warnings
 * @param ast A valid AST data structure
 */
export function validateAst(ast: ESQLAst): { errors: ESQLMessage[]; warnings: ESQLMessage[] } {
  const errors: ESQLMessage[] = [];
  const warnings: ESQLMessage[] = [];
  //   console.log({ ast });
  for (const command of ast) {
    // first check that all function used here are valid
    for (const arg of command.args) {
      if (!Array.isArray(arg) && arg.type === 'function') {
        const payload = validateFunction(arg, command.name);
        if (payload.errors) {
          errors.push(...payload.errors);
        }
        if (payload.warnings) {
          warnings.push(...payload.warnings);
        }
      }
    }
  }
  return { errors, warnings };
}
