/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isSource, isSubQuery, walk } from '@elastic/esql';
import type {
  ESQLAst,
  ESQLAstAllCommands,
  ESQLAstFuseCommand,
  ESQLSingleAstItem,
} from '@elastic/esql/types';
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

  const missingFields: string[] = [...REQUIRED_METADATA_FIELDS];
  const sourceCommand = ast.find((_command) =>
    ['ts', 'from'].includes(_command.name.toLocaleLowerCase())
  );

  if (sourceCommand) {
    walk(sourceCommand, {
      visitCommandOption: (node) => {
        if (node.name.toLocaleLowerCase() === 'metadata') {
          const metadataFields = node.args.map((arg) =>
            (arg as ESQLSingleAstItem)?.name?.toLocaleLowerCase()
          );
          for (const field of REQUIRED_METADATA_FIELDS) {
            if (metadataFields.includes(field)) {
              missingFields.splice(missingFields.indexOf(field), 1);
            }
          }
        }
      },
    });
  }

  if (
    missingFields.length > 0 &&
    context?.namedSubqueries?.length &&
    readsNamedSubquery(sourceCommand, context.namedSubqueries)
  ) {
    // The default fields can reach FUSE through a LET without appearing in the outer FROM.
    const { keyBy, scoreBy } = extractFuseArgs(command as ESQLAstFuseCommand);
    const missing = missingFields.filter(
      (field) => !(field === '_score' ? scoreBy : keyBy) && !context.columns.has(field)
    );
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
