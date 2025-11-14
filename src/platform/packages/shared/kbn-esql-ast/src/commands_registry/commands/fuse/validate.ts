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

  let hasIdMetadata = false;
  let hasIndexMetadata = false;
  let hasScoreMetadata = false;

  const fromCommand = ast.find((_command) => _command.name.toLocaleLowerCase() === 'from');

  if (fromCommand) {
    walk(fromCommand, {
      visitCommandOption: (node) => {
        if (node.name.toLocaleLowerCase() === 'metadata') {
          const metadataFields = node.args.map((arg) => (arg as ESQLSingleAstItem).name);
          if (metadataFields.includes('_id')) {
            hasIdMetadata = true;
          }
          if (metadataFields.includes('_index')) {
            hasIndexMetadata = true;
          }
          if (metadataFields.includes('_score')) {
            hasScoreMetadata = true;
          }
        }
      },
    });
  }

  if (!hasIdMetadata) {
    messages.push(buildMissingMetadataMessage(command, '_id'));
  }
  if (!hasIndexMetadata) {
    messages.push(buildMissingMetadataMessage(command, '_index'));
  }
  if (!hasScoreMetadata) {
    messages.push(buildMissingMetadataMessage(command, '_score'));
  }

  return messages;
};
