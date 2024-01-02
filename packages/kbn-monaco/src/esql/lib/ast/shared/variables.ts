/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLColumn, ESQLAstItem, ESQLCommand, ESQLCommandOption } from '../types';
import type { ESQLVariable, ESQLRealField } from '../validation/types';
import { EDITOR_MARKER } from './constants';
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

function addToVariables(
  oldArg: ESQLAstItem,
  newArg: ESQLAstItem,
  fields: Map<string, ESQLRealField>,
  variables: Map<string, ESQLVariable[]>
) {
  if (isColumnItem(oldArg) && isColumnItem(newArg)) {
    const newVariable: ESQLVariable = {
      name: newArg.name,
      type: 'number' /* fallback to number */,
      location: newArg.location,
    };
    // Now workout the exact type
    // it can be a rename of another variable as well
    let oldRef = fields.get(oldArg.name) || variables.get(oldArg.name);
    if (oldRef) {
      addToVariableOccurrencies(variables, newVariable);
      newVariable.type = Array.isArray(oldRef) ? oldRef[0].type : oldRef.type;
    } else if (oldArg.quoted) {
      // a last attempt in case the user tried to rename an expression:
      // trim every space and try a new hit
      const expressionTrimmedRef = oldArg.name.replace(/\s/g, '');
      oldRef = variables.get(expressionTrimmedRef);
      if (oldRef) {
        addToVariableOccurrencies(variables, newVariable);
        newVariable.type = oldRef[0].type;
        replaceTrimmedVariable(variables, oldArg, oldRef);
      }
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
  fieldsMap: Map<string, ESQLRealField>
) {
  const anyVariables = collectVariables(commands, fieldsMap);
  const currentCommandVariables = collectVariables([currentCommand], fieldsMap);
  const resultVariables = new Map<string, ESQLVariable[]>();
  anyVariables.forEach((value, key) => {
    if (!currentCommandVariables.has(key)) {
      resultVariables.set(key, value);
    }
  });
  return resultVariables;
}

export function collectVariables(
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
        if (!expressionOperation.text.includes(EDITOR_MARKER)) {
          // just save the entire expression as variable string
          const expressionType = 'number';
          addToVariableOccurrencies(variables, {
            name: expressionOperation.text.replace(/`/g, ''),
            type: expressionType,
            location: expressionOperation.location,
          });
        }
      }
    }
    if (command.name === 'enrich') {
      const commandOptionsWithAssignment = command.args.filter(
        (arg) => isOptionItem(arg) && arg.name === 'with'
      ) as ESQLCommandOption[];
      for (const commandOption of commandOptionsWithAssignment) {
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
