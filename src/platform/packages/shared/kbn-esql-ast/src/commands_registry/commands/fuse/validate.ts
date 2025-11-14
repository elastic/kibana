/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAst, ESQLAstAllCommands, ESQLMessage } from '../../../types';
import type { ICommandContext } from '../../types';
import { buildMissingMetadataMessage } from './utils';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  // If no columns are provided don't perform the client side validation, to avoid false positives.
  if (context?.columns?.size === 0) {
    return messages;
  }

  if (!context?.columns.get('_id')) {
    messages.push(buildMissingMetadataMessage(command, '_id'));
  }

  if (!context?.columns.get('_index')) {
    messages.push(buildMissingMetadataMessage(command, '_index'));
  }

  if (!context?.columns.get('_score')) {
    messages.push(buildMissingMetadataMessage(command, '_score'));
  }

  return messages;
};
