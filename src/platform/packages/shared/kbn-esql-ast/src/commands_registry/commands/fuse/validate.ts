/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { walk } from '../../../walker';
import type { ESQLAst, ESQLAstAllCommands, ESQLMessage, ESQLSingleAstItem } from '../../../types';
import type { ICommandContext } from '../../types';
import { buildMissingMetadataMessage } from './utils';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const requiredMetadataFields = ['_id', '_index', '_score'];
  let hasMetadata = false;
  const sourceCommand = ast.find((_command) =>
    ['ts', 'from'].includes(_command.name.toLocaleLowerCase())
  );

  if (sourceCommand) {
    walk(sourceCommand, {
      visitCommandOption: (node) => {
        if (node.name.toLocaleLowerCase() === 'metadata') {
          hasMetadata = true;
          const metadataFields = node.args.map((arg) =>
            (arg as ESQLSingleAstItem)?.name?.toLocaleLowerCase()
          );
          for (const field of requiredMetadataFields) {
            if (!metadataFields.includes(field)) {
              messages.push(buildMissingMetadataMessage(command, field));
            }
          }
        }
      },
    });
  }

  if (!hasMetadata) {
    messages.push(buildMissingMetadataMessage(command, requiredMetadataFields.join(', ')));
  }

  return messages;
};
