/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '../../../walker';
import { LeafPrinter } from '../../../../pretty_print';
import type {
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLList,
  ESQLLiteral,
  ESQLProperNode,
} from '../../../../types';
import * as generic from '../../generic';

/**
 * Lists all "STATS" commands in the query AST.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @returns A collection of "LIMIT" commands.
 */
export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLCommand> => {
  return generic.commands.list(ast, (cmd) => cmd.name === 'stats');
};

/**
 * Retrieves the "STATS" command at the specified index in order of appearance.
 *
 * @param ast The root AST node to search for "STATS" commands.
 * @param index The index of the "STATS" command to retrieve.
 * @returns The "STATS" command at the specified index, if any.
 */
export const byIndex = (ast: ESQLAstQueryExpression, index: number): ESQLCommand | undefined => {
  return [...list(ast)][index];
};

export type Terminal = ESQLColumn | ESQLLiteral | ESQLList;

/**
 * Retrieves a list of terminal nodes that were found in the field definition. //HD should be here???
 */
export const getFieldTerminals = (definition: ESQLProperNode) => {
  const terminals: Array<Terminal> = [];

  Walker.walk(definition, {
    visitLiteral(node) {
      terminals.push(node);
    },
    visitColumn(node) {
      terminals.push(node);
    },
    visitListLiteral(node) {
      terminals.push(node);
    },
  });

  return terminals;
};

/**
 * Retrieves a formatted list of field names which were used for the new field
 * construction. For example, in the below example, `x` and `y` are the
 * existing "used" fields:
 *
 * ```
 * STATS foo = agg(x) BY y, bar = x
 * ```
 */
export const getUsedFields = (definition: ESQLProperNode) => {
  const usedFields: Set<string> = new Set();

  Walker.walk(definition, {
    visitColumn(node) {
      usedFields.add(LeafPrinter.column(node));
    },
  });

  return usedFields;
};
