/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { walk } from '@elastic/esql';
import type {
  ESQLAst,
  ESQLAstAllCommands,
  ESQLAstCommand,
  ESQLSingleAstItem,
} from '@elastic/esql/types';
import type { ICommandContext } from '../types';
import {
  findNamedSubqueryForSource,
  type NamedSubquery,
} from '../../definitions/utils/named_subqueries';
import { buildMissingMetadataMessage } from './utils';
import type { ESQLMessage } from '../..';

const REQUIRED_METADATA_FIELDS = ['_id', '_index', '_score'];

const findSourceCommand = (commands: ESQLAstCommand[]): ESQLAstCommand | undefined =>
  commands.find((_command) => ['ts', 'from'].includes(_command.name.toLocaleLowerCase()));

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const missingFields: string[] = [...REQUIRED_METADATA_FIELDS];
  const sourceCommand = findSourceCommand(ast);

  // A LET read by the source command brings the METADATA of its own source command,
  // like an inline subquery does.
  const visitedBindings = new Set<NamedSubquery>();
  const pending: ESQLAstCommand[] = sourceCommand ? [sourceCommand] : [];

  for (let next = pending.pop(); next; next = pending.pop()) {
    walk(next, {
      visitSource: (source) => {
        const namedSubquery = findNamedSubqueryForSource(source, context?.namedSubqueries ?? []);
        if (!namedSubquery || visitedBindings.has(namedSubquery)) {
          return;
        }

        visitedBindings.add(namedSubquery);
        const bodySourceCommand = findSourceCommand(namedSubquery.query.commands);
        if (bodySourceCommand) {
          pending.push(bodySourceCommand);
        }
      },
      visitCommandOption: (node) => {
        if (node.name.toLocaleLowerCase() === 'metadata') {
          const metadataFields = node.args.map((arg) =>
            (arg as ESQLSingleAstItem)?.name?.toLocaleLowerCase()
          );
          for (const field of REQUIRED_METADATA_FIELDS) {
            const index = missingFields.indexOf(field);
            if (metadataFields.includes(field) && index >= 0) {
              missingFields.splice(index, 1);
            }
          }
        }
      },
    });
  }

  if (missingFields.length > 0) {
    messages.push(buildMissingMetadataMessage(command, missingFields.join(', ')));
  }
  return messages;
};
