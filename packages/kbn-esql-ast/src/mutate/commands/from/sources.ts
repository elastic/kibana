/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../../builder';
import { ESQLAstQueryExpression, ESQLSource } from '../../../types';
import { Visitor } from '../../../visitor';
import * as generic from '../../generic';
import * as util from '../../util';
import type { Predicate } from '../../types';

export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLSource> => {
  return new Visitor()
    .on('visitFromCommand', function* (ctx): IterableIterator<ESQLSource> {
      for (const argument of ctx.arguments()) {
        if (argument.type === 'source') {
          yield argument;
        }
      }
    })
    .on('visitCommand', function* (): IterableIterator<ESQLSource> {})
    .on('visitQuery', function* (ctx): IterableIterator<ESQLSource> {
      for (const command of ctx.visitCommands()) {
        yield* command;
      }
    })
    .visitQuery(ast);
};

export const findByPredicate = (
  ast: ESQLAstQueryExpression,
  predicate: Predicate<ESQLSource>
): ESQLSource | undefined => {
  return util.findByPredicate(list(ast), predicate);
};

export const find = (
  ast: ESQLAstQueryExpression,
  index: string,
  cluster?: string
): ESQLSource | undefined => {
  return findByPredicate(ast, (source) => {
    if (index !== source.index) {
      return false;
    }
    if (typeof cluster === 'string' && cluster !== source.cluster) {
      return false;
    }

    return true;
  });
};

export const remove = (
  ast: ESQLAstQueryExpression,
  index: string,
  cluster?: string
): ESQLSource | undefined => {
  const node = find(ast, index, cluster);

  if (!node) {
    return undefined;
  }

  const success = generic.commands.args.remove(ast, node);

  return success ? node : undefined;
};

export const insert = (
  ast: ESQLAstQueryExpression,
  indexName: string,
  clusterName?: string,
  index: number = -1
): ESQLSource | undefined => {
  const command = generic.commands.findByName(ast, 'from');

  if (!command) {
    return;
  }

  const source = Builder.expression.indexSource(indexName, clusterName);

  if (index === -1) {
    generic.commands.args.append(command, source);
  } else {
    command.args.splice(index, 0, source);
  }

  return source;
};

export const upsert = (
  ast: ESQLAstQueryExpression,
  indexName: string,
  clusterName?: string,
  index: number = -1
): ESQLSource | undefined => {
  const source = find(ast, indexName, clusterName);

  if (source) {
    return source;
  }

  return insert(ast, indexName, clusterName, index);
};
