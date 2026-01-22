/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { walk } from '../../../ast/walker';
import type { ESQLAst, ESQLAstAllCommands, ESQLMessage, ESQLSingleAstItem } from '../../../types';
import type { ICommandContext } from '../types';
import { buildMissingMetadataMessage } from './utils';

const REQUIRED_METADATA_FIELDS = ['_id', '_index', '_score'];

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

  if (missingFields.length > 0) {
    messages.push(buildMissingMetadataMessage(command, missingFields.join(', ')));
  }
  return messages;
};
