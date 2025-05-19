/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../../builder';
import type {
  ESQLAstQueryExpression,
  ESQLAstRerankCommand,
  ESQLCommandOption,
  ESQLIdentifierOrParam,
  ESQLStringLiteral,
} from '../../../types';
import * as generic from '../../generic';

/**
 * Lists all "RERANK" commands in the query AST.
 *
 * @param ast The root AST node to search for "RERANK" commands.
 * @returns A collection of "RERANK" commands.
 */
export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLAstRerankCommand> => {
  return generic.commands.list(
    ast,
    (cmd) => cmd.name === 'rerank'
  ) as IterableIterator<ESQLAstRerankCommand>;
};

export const setQuery = (cmd: ESQLAstRerankCommand, query: string | ESQLStringLiteral) => {
  if (typeof query === 'string') {
    query = Builder.expression.literal.string(query);
  }

  cmd.query = query;
  cmd.args[0] = query;
};

export const setFields = (
  cmd: ESQLAstRerankCommand,
  fields: string[] | ESQLAstRerankCommand['fields']
) => {
  if (typeof fields[0] === 'string') {
    fields = fields.map((fieldOrFieldName) => {
      return typeof fieldOrFieldName === 'string'
        ? Builder.expression.column(fieldOrFieldName)
        : fieldOrFieldName;
    });
  }

  cmd.fields.length = 0;
  cmd.fields.push(...(fields as ESQLAstRerankCommand['fields']));
};

export const setInferenceId = (cmd: ESQLAstRerankCommand, id: string | ESQLIdentifierOrParam) => {
  if (typeof id === 'string') {
    id = id[0] === '?' ? Builder.param.build(id) : Builder.identifier(id);
  }

  if (id.type !== 'identifier' && id.type !== 'literal') {
    throw new Error(`Invalid RERANK inferenceId: ${id}`);
  }

  cmd.inferenceId = id;

  const withOption = cmd.args[2] as ESQLCommandOption;
  withOption.args[0] = id;
};
