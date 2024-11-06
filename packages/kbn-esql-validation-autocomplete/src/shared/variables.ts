/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAst, ESQLAstItem, ESQLCommand, ESQLFunction } from '@kbn/esql-ast';
import { Visitor } from '@kbn/esql-ast/src/visitor';
import type { ESQLVariable, ESQLRealField } from '../validation/types';
import { EDITOR_MARKER } from './constants';
import { isColumnItem, isFunctionItem, getFunctionDefinition } from './helpers';

function addToVariableOccurrences(variables: Map<string, ESQLVariable[]>, instance: ESQLVariable) {
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
      name: newArg.parts.join('.'),
      type: 'double' /* fallback to number */,
      location: newArg.location,
    };
    // Now workout the exact type
    // it can be a rename of another variable as well
    const oldRef = fields.get(oldArg.parts.join('.')) || variables.get(oldArg.parts.join('.'));
    if (oldRef) {
      addToVariableOccurrences(variables, newVariable);
      newVariable.type = Array.isArray(oldRef) ? oldRef[0].type : oldRef.type;
    }
  }
}

/**
 * Determines the type of the expression
 *
 * TODO - this function needs a lot of work. For example, it needs to find the best-matching function signature
 * which it isn't currently doing. See https://github.com/elastic/kibana/issues/195682
 */
function getExpressionType(
  root: ESQLAstItem,
  fields: Map<string, ESQLRealField>,
  variables: Map<string, ESQLVariable[]>
): string {
  const fallback = 'double';

  if (Array.isArray(root) || !root) {
    return fallback;
  }
  if (root.type === 'literal') {
    return root.literalType;
  }
  if (root.type === 'inlineCast') {
    if (root.castType === 'int') {
      return 'integer';
    }
    if (root.castType === 'bool') {
      return 'boolean';
    }
    return root.castType;
  }
  if (isColumnItem(root)) {
    const field = fields.get(root.parts.join('.'));
    if (field) {
      return field.type;
    }
    const variable = variables.get(root.parts.join('.'));
    if (variable) {
      return variable[0].type;
    }
  }
  if (isFunctionItem(root)) {
    const fnDefinition = getFunctionDefinition(root.name);
    return fnDefinition?.signatures[0].returnType ?? fallback;
  }
  return fallback;
}

function getAssignRightHandSideType(
  item: ESQLAstItem,
  fields: Map<string, ESQLRealField>,
  variables: Map<string, ESQLVariable[]>
) {
  if (Array.isArray(item)) {
    const firstArg = item[0];
    return getExpressionType(firstArg, fields, variables);
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

function addVariableFromAssignment(
  assignOperation: ESQLFunction,
  variables: Map<string, ESQLVariable[]>,
  fields: Map<string, ESQLRealField>
) {
  if (isColumnItem(assignOperation.args[0])) {
    const rightHandSideArgType = getAssignRightHandSideType(
      assignOperation.args[1],
      fields,
      variables
    );
    addToVariableOccurrences(variables, {
      name: assignOperation.args[0].parts.join('.'),
      type: rightHandSideArgType as string /* fallback to number */,
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
    const expressionText = queryString.substring(
      expressionOperation.location.min,
      expressionOperation.location.max + 1
    );
    const expressionType = 'double'; // TODO - use getExpressionType once it actually works
    addToVariableOccurrences(variables, {
      name: expressionText,
      type: expressionType,
      location: expressionOperation.location,
    });
  }
}

export function collectVariables(
  ast: ESQLAst,
  fields: Map<string, ESQLRealField>,
  queryString: string
): Map<string, ESQLVariable[]> {
  const variables = new Map<string, ESQLVariable[]>();

  const visitor = new Visitor()
    .on('visitLiteralExpression', (ctx) => {
      // TODO - add these as variables
    })
    .on('visitExpression', (_ctx) => {}) // required for the types :shrug:
    .on('visitRenameExpression', (ctx) => {
      const [oldArg, newArg] = ctx.node.args;
      addToVariables(oldArg, newArg, fields, variables);
    })
    .on('visitFunctionCallExpression', (ctx) => {
      if (ctx.node.name === '=') {
        addVariableFromAssignment(ctx.node, variables, fields);
      } else {
        addVariableFromExpression(ctx.node, queryString, variables);
      }
    })
    .on('visitCommandOption', (ctx) => {
      if (ctx.node.name === 'by') {
        return [...ctx.visitArguments()];
      } else if (ctx.node.name === 'with') {
        for (const assignFn of ctx.node.args) {
          if (isFunctionItem(assignFn)) {
            const [newArg, oldArg] = assignFn?.args || [];
            // TODO why is oldArg an array?
            if (Array.isArray(oldArg)) {
              addToVariables(oldArg[0], newArg, fields, variables);
            }
          }
        }
      }
    })
    .on('visitCommand', (ctx) => {
      const ret = [];
      if (['row', 'eval', 'stats', 'inlinestats', 'metrics', 'rename'].includes(ctx.node.name)) {
        ret.push(...ctx.visitArgs());
      }
      if (['stats', 'inlinestats', 'enrich'].includes(ctx.node.name)) {
        // BY and WITH can contain variables
        ret.push(...ctx.visitOptions());
      }
      return ret;
    })
    .on('visitQuery', (ctx) => [...ctx.visitCommands()]);

  visitor.visitQuery(ast);

  return variables;
}
