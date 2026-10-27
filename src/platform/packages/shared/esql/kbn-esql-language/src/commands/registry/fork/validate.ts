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
  ESQLAstAllCommands,
  ESQLAstForkCommand,
  ESQLCommand,
} from '@elastic/esql/types';
import { isSubQuery, Walker } from '@elastic/esql';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { validateCommandArguments } from '../../definitions/utils/validation';
import { errors } from '../../definitions/utils';
import type { ESQLMessage } from '../../definitions/types';

const MAX_BRANCHES = 8;

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const forkCommand = command as ESQLAstForkCommand;
  const messages: ESQLMessage[] = [];

  if (forkCommand.args.length > MAX_BRANCHES) {
    messages.push(errors.forkTooManyBranches(forkCommand));
  }

  messages.push(...validateCommandArguments(forkCommand, ast, context, callbacks));

  // Allow a FORK in the main query and another in an independent subquery.
  // Only report an error for consecutive FORKs or a FORK directly inside another FORK.
  const forks: ESQLCommand[] = [];
  Walker.walk(ast, {
    visitCommand: (node) => {
      if (node.name === 'fork') {
        forks.push(node);
      }
    },
    visitParens: (node, parent, walker) => {
      const isForkBranch = parent?.type === 'command' && parent.name === 'fork';
      if (isSubQuery(node) && !isForkBranch) {
        walker.skipChildren();
      }
    },
  });

  if (forks.length > 1) {
    messages.push(errors.tooManyForks(forks[1]));
  }

  return messages;
};
