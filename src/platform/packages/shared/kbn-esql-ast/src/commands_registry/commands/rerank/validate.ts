/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ESQLCommand, ESQLMessage, ESQLAst, ESQLAstRerankCommand } from '../../../types';
import type { ICommandContext, ICommandCallbacks } from '../../types';
import { validateCommandArguments } from '../../../definitions/utils/validation';

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  // Run standard argument validation
  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  // Cast to RERANK command for type-specific validation
  const rerankCommand = command as ESQLAstRerankCommand;

  // Validate that query text is provided
  if (!rerankCommand.query) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-ast.esql.validation.rerankMissingQuery', {
        defaultMessage: '[RERANK] Query text is required.',
      }),
      type: 'error',
      code: 'rerankMissingQuery',
    });
  }

  // Validate that at least one field is specified in ON clause
  if (!rerankCommand.fields || rerankCommand.fields.length === 0) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-ast.esql.validation.rerankMissingFields', {
        defaultMessage: '[RERANK] At least one field must be specified in the ON clause.',
      }),
      type: 'error',
      code: 'rerankMissingFields',
    });
  }

  // Validate that inference ID is provided
  if (!rerankCommand.inferenceId) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-ast.esql.validation.rerankMissingInferenceId', {
        defaultMessage: '[RERANK] Inference endpoint must be specified using WITH clause.',
      }),
      type: 'error',
      code: 'rerankMissingInferenceId',
    });
  }

  return messages;
};
