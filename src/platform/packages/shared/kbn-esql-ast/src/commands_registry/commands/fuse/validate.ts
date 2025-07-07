/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLAst, ESQLCommand, ESQLMessage } from '../../../types';
import type { ICommandContext } from '../../types';
import { buildMissingMetadataMessage, isFuseImmediatelyAfterFork } from './utils';

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  if (!isFuseImmediatelyAfterFork(ast)) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-ast.esql.validation.fuseMissingScoreMetadata', {
        defaultMessage: '[FUSE] Must be immediately preceded by a FORK command.',
      }),
      type: 'error',
      code: 'fuseNotImmediatelyAfterFork',
    });
  }

  if (!context?.fields.get('_id')) {
    messages.push(buildMissingMetadataMessage(command, '_id'));
  }

  if (!context?.fields.get('_index')) {
    messages.push(buildMissingMetadataMessage(command, '_index'));
  }

  if (!context?.fields.get('_score')) {
    messages.push(buildMissingMetadataMessage(command, '_score'));
  }

  return messages;
};
