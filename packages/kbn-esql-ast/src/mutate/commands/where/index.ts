/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '../../../walker';
import { LeafPrinter } from '../../../pretty_print';
import { Builder } from '../../../builder';
import type {
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLIdentifier,
  ESQLLiteral,
  ESQLParamLiteral,
  ESQLProperNode,
} from '../../../types';
import * as generic from '../../generic';

/**
 * Lists all "WHERE" commands in the query AST.
 *
 * @param ast The root AST node to search for "WHERE" commands.
 * @returns A collection of "WHERE" commands.
 */
export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLCommand> => {
  return generic.commands.list(ast, (cmd) => cmd.name === 'where');
};

/**
 * Retrieves the "WHERE" command at the specified index in order of appearance.
 *
 * @param ast The root AST node to search for "WHERE" commands.
 * @param index The index of the "WHERE" command to retrieve.
 * @returns The "WHERE" command at the specified index, if any.
 */
export const byIndex = (ast: ESQLAstQueryExpression, index: number): ESQLCommand | undefined => {
  return [...list(ast)][index];
};

export type ESQLAstField = ESQLColumn | ESQLIdentifier | ESQLParamLiteral;
export type ESQLAstFieldTemplate = string | string[] | ESQLAstField;

const fieldTemplateToField = (template: ESQLAstFieldTemplate): ESQLAstField => {
  if (typeof template === 'string') {
    const identifier = Builder.identifier({ name: template });
    const column = Builder.expression.column({ args: [identifier] });
    return column;
  } else if (Array.isArray(template)) {
    const identifiers = template.map((name) => Builder.identifier({ name }));
    const column = Builder.expression.column({ args: identifiers });
    return column;
  }

  return template;
};

const matchNodeAgainstField = (node: ESQLProperNode, field: ESQLAstField): boolean => {
  switch (node.type) {
    case 'column':
    case 'identifier': {
      switch (field.type) {
        case 'column':
        case 'identifier': {
          return LeafPrinter.print(node) === LeafPrinter.print(field);
        }
      }
    }
    case 'literal': {
      const literal = node as ESQLLiteral;
      if (literal.literalType !== 'param') {
        return false;
      }
      if (field.type !== 'literal') {
        return false;
      }
      if (literal.literalType === field.literalType && literal.value === field.value) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Finds the first "WHERE" command which contains the specified text as one of
 * its comparison operands. The text can represent a field (including nested
 * fields or a single identifier), or a param.
 *
 * Examples:
 *
 * ```ts
 * byField(ast, 'field');
 * byField(ast, ['nested', 'field']);
 * byField(ast, '?param');
 * byField(ast, ['nested', '?param']);
 * byField(ast, ['nested', 'positional', 'param', '?123']);
 * byField(ast, '?');
 * ```
 *
 * @param ast The root AST node search for "WHERE" commands.
 * @param text The text or nested column name texts to search for.
 */
export const byField = (
  ast: ESQLAstQueryExpression,
  template: ESQLAstFieldTemplate
): ESQLCommand | undefined => {
  const field = fieldTemplateToField(template);

  for (const command of list(ast)) {
    let found = false;

    const matchNode = (node: ESQLProperNode) => {
      if (matchNodeAgainstField(node, field)) {
        found = true;
      }
    };

    Walker.walk(command, {
      visitColumn: matchNode,
      visitIdentifier: matchNode,
      visitLiteral: matchNode,
    });

    if (found) {
      return command;
    }
  }

  return undefined;
};
