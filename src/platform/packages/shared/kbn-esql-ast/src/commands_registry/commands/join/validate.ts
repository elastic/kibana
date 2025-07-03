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
  ESQLCommand,
  ESQLMessage,
  ESQLProperNode,
  ESQLSource,
  ESQLIdentifier,
  ESQLAst,
} from '../../../types';
import { isBinaryExpression, isIdentifier, isSource } from '../../../ast/is';
import type { ICommandContext } from '../../types';
import { errors } from '../../../definitions/utils/errors';

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
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

  return messages;
};
