/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLAstAllCommands,
  ESQLMessage,
  ESQLAst,
  ESQLAstRerankCommand,
} from '../../../types';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { getExpressionType } from '../../definitions/utils/expressions';
import { validateCommandArguments } from '../../definitions/utils/validation';
import { errors } from '../../definitions/utils/errors';

const supportedQueryTypes = ['keyword', 'text', 'param'];

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const { query, location, inferenceId } = command as ESQLAstRerankCommand;
  const rerankExpressionType = getExpressionType(
    query,
    context?.columns,
    context?.unmappedFieldsStrategy
  );

  // check for supported query types
  if (!supportedQueryTypes.includes(rerankExpressionType)) {
    messages.push(
      errors.byId('unsupportedQueryType', 'location' in query ? query?.location : location, {
        command: 'RERANK',
        expressionType: rerankExpressionType,
      })
    );
  }

  if (inferenceId?.incomplete) {
    messages.push(errors.byId('inferenceIdRequired', command.location, { command: 'RERANK' }));
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  return messages;
};
