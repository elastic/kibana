/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLAstItem, ESQLCommand, ESQLCommandOption, ESQLFunction } from '@kbn/esql-ast';
import type { ESQLVariable, ESQLRealField } from '../validation/types';
import { DOUBLE_BACKTICK, EDITOR_MARKER, SINGLE_BACKTICK } from './constants';
import {
  isColumnItem,
  isAssignment,
  isExpression,
  isOptionItem,
  isFunctionItem,
  getFunctionDefinition,
} from './helpers';

function addToVariableOccurrencies(variables: Map<string, ESQLVariable[]>, instance: ESQLVariable) {
  if (!variables.has(instance.name)) {
    variables.set(instance.name, []);
  }
  const variablesOccurrencies = variables.get(instance.name)!;
  variablesOccurrencies.push(instance);
}

function addToVariables(
  oldArg: ESQLAstItem,
  newArg: ESQLAstItem,
  fields: Map<string, ESQLRealField>,
  variables: Map<string, ESQLVariable[]>
) {
  if (isColumnItem(oldArg) && isColumnItem(newArg)) {
    const newVariable: ESQLVariable = {
      name: newArg.name,
      type: 'double' /* fallback to number */,
      location: newArg.location,
    };
    // Now workout the exact type
    // it can be a rename of another variable as well
    const oldRef =
      fields.get(oldArg.name) || variables.get(oldArg.quoted ? oldArg.text : oldArg.name);
    if (oldRef) {
      addToVariableOccurrencies(variables, newVariable);
      newVariable.type = Array.isArray(oldRef) ? oldRef[0].type : oldRef.type;
    }
  }
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
    return firstArg.type;
  }
}

export function excludeVariablesFromCurrentCommand(
  commands: ESQLCommand[],
  currentCommand: ESQLCommand,
  fieldsMap: Map<string, ESQLRealField>,
  queryString: string
) {
  const anyVariables = collectVariables(commands, fieldsMap, queryString);
  const currentCommandVariables = collectVariables([currentCommand], fieldsMap, queryString);
  const resultVariables = new Map<string, ESQLVariable[]>();
  anyVariables.forEach((value, key) => {
    if (!currentCommandVariables.has(key)) {
      resultVariables.set(key, value);
    }
  });
  return resultVariables;
}

function extractExpressionAsQuotedVariable(
  originalQuery: string,
  location: { min: number; max: number }
) {
  const extractExpressionText = originalQuery.substring(location.min, location.max + 1);
  // now inject quotes and save it as variable
  return `\`${extractExpressionText.replaceAll(SINGLE_BACKTICK, DOUBLE_BACKTICK)}\``;
}

function addVariableFromAssignment(
  assignOperation: ESQLFunction,
  variables: Map<string, ESQLVariable[]>,
  fields: Map<string, ESQLRealField>
) {
  if (isColumnItem(assignOperation.args[0])) {
    const rightHandSideArgType = getAssignRightHandSideType(assignOperation.args[1], fields);
    addToVariableOccurrencies(variables, {
      name: assignOperation.args[0].name,
      type: (rightHandSideArgType as string) || 'double' /* fallback to number */,
      location: assignOperation.args[0].location,
    });
  }
}

function addVariableFromExpression(
  expressionOperation: ESQLFunction,
  queryString: string,
  variables: Map<string, ESQLVariable[]>
) {
  if (!expressionOperation.text.includes(EDITOR_MARKER)) {
    // save the variable in its quoted usable way
    // (a bit of forward thinking here to simplyfy lookups later)
    const forwardThinkingVariableName = extractExpressionAsQuotedVariable(
      queryString,
      expressionOperation.location
    );
    const expressionType = 'double';
    addToVariableOccurrencies(variables, {
      name: forwardThinkingVariableName,
      type: expressionType,
      location: expressionOperation.location,
    });
  }
}

export const collectVariablesFromList = (
  list: ESQLAstItem[],
  fields: Map<string, ESQLRealField>,
  queryString: string,
  variables: Map<string, ESQLVariable[]>
) => {
  for (const arg of list) {
    if (isAssignment(arg)) {
      addVariableFromAssignment(arg, variables, fields);
    } else if (isExpression(arg)) {
      addVariableFromExpression(arg, queryString, variables);
    }
  }
};

export function collectVariables(
  commands: ESQLCommand[],
  fields: Map<string, ESQLRealField>,
  queryString: string
): Map<string, ESQLVariable[]> {
  const variables = new Map<string, ESQLVariable[]>();
  for (const command of commands) {
    if (['row', 'eval', 'stats', 'inlinestats', 'metrics'].includes(command.name)) {
      collectVariablesFromList(command.args, fields, queryString, variables);
      if (command.name === 'stats' || command.name === 'inlinestats') {
        const commandOptionsWithAssignment = command.args.filter(
          (arg) => isOptionItem(arg) && arg.name === 'by'
        ) as ESQLCommandOption[];
        for (const commandOption of commandOptionsWithAssignment) {
          collectVariablesFromList(commandOption.args, fields, queryString, variables);
        }
      }
    }
    if (command.name === 'enrich') {
      const commandOptionsWithAssignment = command.args.filter(
        (arg) => isOptionItem(arg) && arg.name === 'with'
      ) as ESQLCommandOption[];
      for (const commandOption of commandOptionsWithAssignment) {
        // Enrich assignment has some special behaviour, so do not use the version above here...
        for (const assignFn of commandOption.args) {
          if (isFunctionItem(assignFn)) {
            const [newArg, oldArg] = assignFn?.args || [];
            if (Array.isArray(oldArg)) {
              addToVariables(oldArg[0], newArg, fields, variables);
            }
          }
        }
      }
    }
    if (command.name === 'rename') {
      const commandOptionsWithAssignment = command.args.filter(
        (arg) => isOptionItem(arg) && arg.name === 'as'
      ) as ESQLCommandOption[];
      for (const commandOption of commandOptionsWithAssignment) {
        const [oldArg, newArg] = commandOption.args;
        addToVariables(oldArg, newArg, fields, variables);
      }
    }
  }
  return variables;
}
