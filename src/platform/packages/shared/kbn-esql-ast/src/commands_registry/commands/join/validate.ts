/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLAstJoinCommand,
  ESQLAstAllCommands,
  ESQLMessage,
  ESQLProperNode,
  ESQLSource,
  ESQLIdentifier,
  ESQLAst,
} from '../../../types';
import { isBinaryExpression, isIdentifier, isSource } from '../../../ast/is';
import type { ESQLFieldWithMetadata, ICommandCallbacks, ICommandContext } from '../../types';
import { errors } from '../../../definitions/utils/errors';
import { validateCommandArguments } from '../../../definitions/utils/validation';
import { createEnrichedContext, getOnOption } from './utils';
import type { ESQLSingleAstItem } from '../../../types';

// Type for callbacks that include getColumnsFor (from ESQLCallbacks)
type CallbacksWithGetColumnsFor = ICommandCallbacks & {
  getColumnsFor?: (params: { query: string }) => Promise<ESQLFieldWithMetadata[]>;
};

export const validate = async (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: CallbacksWithGetColumnsFor
): Promise<ESQLMessage[]> => {
  const messages: ESQLMessage[] = [];
  const { commandType, args } = command as ESQLAstJoinCommand;
  const joinSources = context?.joinSources || [];

  if (!['left', 'right', 'lookup'].includes(commandType)) {
    return [errors.unexpected(command.location, 'JOIN command type')];
  }

  const target = args[0] as ESQLProperNode;
  let index: ESQLSource;
  let alias: ESQLIdentifier | undefined;

  if (isBinaryExpression(target)) {
    if (target.name === 'as') {
      alias = target.args[1] as ESQLIdentifier;
      index = target.args[0] as ESQLSource;

      if (!isSource(index) || !isIdentifier(alias)) {
        return [errors.unexpected(target.location)];
      }
    } else {
      return [errors.unexpected(target.location)];
    }
  } else if (isSource(target)) {
    index = target as ESQLSource;
  } else {
    return [errors.unexpected(target.location)];
  }

  let isIndexFound = false;
  for (const { name, aliases } of joinSources) {
    if (index.name === name) {
      isIndexFound = true;
      break;
    }

    if (aliases) {
      for (const aliasName of aliases) {
        if (index.name === aliasName) {
          isIndexFound = true;
          break;
        }
      }
    }
  }

  if (!isIndexFound) {
    const error = errors.invalidJoinIndex(index);
    messages.push(error);

    return messages;
  }

  // Enrich context with lookup index fields for proper validation
  let contextForValidation = context;

  if (callbacks?.getColumnsFor) {
    const joinCommand = command as ESQLAstJoinCommand;

    // Adapter: createEnrichedContext expects callback with (query: string) signature, but getColumnsFor uses ({ query: string })
    const normalizedCallback = async (query: string): Promise<ESQLFieldWithMetadata[]> => {
      const result = await callbacks.getColumnsFor!({ query });

      return result || [];
    };

    contextForValidation = await createEnrichedContext(context, joinCommand, normalizedCallback);
  }

  // Validate JOIN ON expressions
  const onOption = getOnOption(command as ESQLAstJoinCommand);

  if (onOption) {
    messages.push(...validateOnExpressions(command as ESQLAstJoinCommand));
  }

  messages.push(...validateCommandArguments(command, ast, contextForValidation, callbacks));

  return messages;
};

const validateOnExpressions = (joinCommand: ESQLAstJoinCommand): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const onOption = getOnOption(joinCommand)!;
  const expressions = onOption.args as ESQLSingleAstItem[];

  // Find complete binary expressions
  const binaryExpressions = expressions.filter(
    (expr) => isBinaryExpression(expr) && !expr.incomplete
  );

  // Binary expressions cannot be mixed with comma-separated fields
  if (binaryExpressions.length > 0 && expressions.length > 1) {
    messages.push(errors.joinOnSingleExpression(onOption.location));
  }

  return messages;
};
