/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isColumn, isSource, isSubQuery, walk } from '@elastic/esql';
import type { ESQLAst, ESQLAstAllCommands, ESQLAstFuseCommand } from '@elastic/esql/types';
import type { ICommandContext } from '../types';
import { buildMissingMetadataMessage, extractFuseArgs } from './utils';
import { tagSemanticError } from '../../definitions/utils/errors';
import {
  findNamedSubqueryForSource,
  type NamedSubquery,
} from '../../definitions/utils/named_subqueries';
import type { ESQLMessage } from '../..';

const REQUIRED_METADATA_FIELDS = ['_id', '_index', '_score'];

const readsNamedSubquery = (
  command: ESQLAstAllCommands | undefined,
  namedSubqueries: readonly NamedSubquery[]
): boolean =>
  command?.name === 'from' &&
  command.args.some((arg) =>
    isSubQuery(arg)
      ? readsNamedSubquery(arg.child.commands[0], namedSubqueries)
      : isSource(arg) && findNamedSubqueryForSource(arg, namedSubqueries) !== undefined
  );

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const metadataFields = new Set<string>();
  const sourceCommand = ast.find((_command) =>
    ['ts', 'from'].includes(_command.name.toLocaleLowerCase())
  );

  if (sourceCommand) {
    walk(sourceCommand, {
      visitCommandOption: (node) => {
        if (node.name.toLocaleLowerCase() === 'metadata') {
          for (const { name } of node.args.filter(isColumn)) {
            metadataFields.add(name.toLocaleLowerCase());
          }
        }
      },
    });
  }

  // KEY BY replaces the default _id and _index keys, and SCORE BY the default _score.
  const { keyBy, scoreBy } = extractFuseArgs(command as ESQLAstFuseCommand);
  const missingFields = REQUIRED_METADATA_FIELDS.filter(
    (field) => !(field === '_score' ? scoreBy : keyBy) && !metadataFields.has(field)
  );

  if (
    missingFields.length > 0 &&
    context?.namedSubqueries?.length &&
    readsNamedSubquery(sourceCommand, context.namedSubqueries)
  ) {
    // The default fields can reach FUSE through a LET without appearing in the outer FROM.
    const missing = missingFields.filter((field) => !context.columns.has(field));
    if (missing.length > 0) {
      messages.push(
        tagSemanticError(buildMissingMetadataMessage(command, missing.join(', ')), 'getColumnsFor')
      );
    }
  } else if (missingFields.length > 0) {
    messages.push(buildMissingMetadataMessage(command, missingFields.join(', ')));
  }
  return messages;
};
