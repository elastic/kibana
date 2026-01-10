/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLAst,
  ESQLAstWorkflowCommand,
  ESQLAstAllCommands,
  ESQLMessage,
} from '../../../types';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { errors } from '../../definitions/utils/errors';

export const validate = (
  command: ESQLAstAllCommands,
  _ast: ESQLAst,
  _context?: ICommandContext,
  _callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const { workflowId, location } = command as ESQLAstWorkflowCommand;

  // Check if workflow ID is provided and not empty
  if (!workflowId || workflowId.incomplete) {
    messages.push(
      errors.byId('workflowIdRequired', location, { command: 'WORKFLOW' })
    );
  }

  // Note: We intentionally do NOT call validateCommandArguments() here because
  // WORKFLOW inputs use a unique structure (name = value) that the generic
  // validator incorrectly treats as function expressions.

  return messages;
};

