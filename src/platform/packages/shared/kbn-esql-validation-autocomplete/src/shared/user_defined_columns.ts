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
import type { ESQLUserDefinedColumn, ESQLRealField } from '../validation/types';
import { EDITOR_MARKER } from './constants';
import { isColumnItem, isFunctionItem, getExpressionType } from './helpers';

function addToUserDefinedColumnOccurrences(
  userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>,
  instance: ESQLUserDefinedColumn
) {
  if (!userDefinedColumns.has(instance.name)) {
    userDefinedColumns.set(instance.name, []);
  }
  const userDefinedColumnsOccurrencies = userDefinedColumns.get(instance.name)!;
  userDefinedColumnsOccurrencies.push(instance);
}

function addToUserDefinedColumns(
  oldArg: ESQLAstItem,
  newArg: ESQLAstItem,
  fields: Map<string, ESQLRealField>,
  userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>
) {
  if (isColumnItem(oldArg) && isColumnItem(newArg)) {
    const newUserDefinedColumn: ESQLUserDefinedColumn = {
      name: newArg.parts.join('.'),
      type: 'double' /* fallback to number */,
      location: newArg.location,
    };
    // Now workout the exact type
    // it can be a rename of another userDefinedColumn as well
    const oldRef =
      fields.get(oldArg.parts.join('.')) || userDefinedColumns.get(oldArg.parts.join('.'));
    if (oldRef) {
      addToUserDefinedColumnOccurrences(userDefinedColumns, newUserDefinedColumn);
      newUserDefinedColumn.type = Array.isArray(oldRef) ? oldRef[0].type : oldRef.type;
    }
  }
}

export function excludeUserDefinedColumnsFromCurrentCommand(
  commands: ESQLCommand[],
  currentCommand: ESQLCommand,
  fieldsMap: Map<string, ESQLRealField>,
  queryString: string
) {
  const anyUserDefinedColumns = collectUserDefinedColumns(commands, fieldsMap, queryString);
  const currentCommandUserDefinedColumns = collectUserDefinedColumns(
    [currentCommand],
    fieldsMap,
    queryString
  );
  const resultUserDefinedColumns = new Map<string, ESQLUserDefinedColumn[]>();
  anyUserDefinedColumns.forEach((value, key) => {
    if (!currentCommandUserDefinedColumns.has(key)) {
      resultUserDefinedColumns.set(key, value);
    }
  });
  return resultUserDefinedColumns;
}

function addUserDefinedColumnFromAssignment(
  assignOperation: ESQLFunction,
  userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>,
  fields: Map<string, ESQLRealField>
) {
  if (isColumnItem(assignOperation.args[0])) {
    const rightHandSideArgType = getExpressionType(
      assignOperation.args[1],
      fields,
      userDefinedColumns
    );
    addToUserDefinedColumnOccurrences(userDefinedColumns, {
      name: assignOperation.args[0].parts.join('.'),
      type: rightHandSideArgType /* fallback to number */,
      location: assignOperation.args[0].location,
    });
  }
}

function addUserDefinedColumnFromExpression(
  expressionOperation: ESQLFunction,
  queryString: string,
  userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>,
  fields: Map<string, ESQLRealField>
) {
  if (!expressionOperation.text.includes(EDITOR_MARKER)) {
    const expressionText = queryString.substring(
      expressionOperation.location.min,
      expressionOperation.location.max + 1
    );
    const expressionType = getExpressionType(expressionOperation, fields, userDefinedColumns);
    addToUserDefinedColumnOccurrences(userDefinedColumns, {
      name: expressionText,
      type: expressionType,
      location: expressionOperation.location,
    });
  }
}

export function collectUserDefinedColumns(
  ast: ESQLAst,
  fields: Map<string, ESQLRealField>,
  queryString: string
): Map<string, ESQLUserDefinedColumn[]> {
  const userDefinedColumns = new Map<string, ESQLUserDefinedColumn[]>();

  const visitor = new Visitor()
    .on('visitLiteralExpression', (ctx) => {
      // TODO - add these as userDefinedColumns
    })
    .on('visitExpression', (_ctx) => {}) // required for the types :shrug:
    .on('visitRenameExpression', (ctx) => {
      const [oldArg, newArg] = ctx.node.args;
      addToUserDefinedColumns(oldArg, newArg, fields, userDefinedColumns);
    })
    .on('visitFunctionCallExpression', (ctx) => {
      const node = ctx.node;

      if (node.subtype === 'binary-expression' && node.name === 'where') {
        ctx.visitArgument(0, undefined);
        return;
      }

      if (node.name === '=') {
        addUserDefinedColumnFromAssignment(node, userDefinedColumns, fields);
      } else {
        addUserDefinedColumnFromExpression(node, queryString, userDefinedColumns, fields);
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
              addToUserDefinedColumns(oldArg[0], newArg, fields, userDefinedColumns);
            }
          }
        }
      }
    })
    .on('visitCommand', (ctx) => {
      const ret = [];
      if (['row', 'eval', 'stats', 'inlinestats', 'ts', 'rename'].includes(ctx.node.name)) {
        ret.push(...ctx.visitArgs());
      }
      if (['stats', 'inlinestats', 'enrich'].includes(ctx.node.name)) {
        // BY and WITH can contain userDefinedColumns
        ret.push(...ctx.visitOptions());
      }
      return ret;
    })
    .on('visitQuery', (ctx) => [...ctx.visitCommands()]);

  visitor.visitQuery(ast);

  return userDefinedColumns;
}
