/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstAllCommands, ESQLAstUserAgentCommand } from '@elastic/esql/types';
import { pipeCompleteItem, withCompleteItem } from '../complete_items';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../types';
import { getPosition, UserAgentPosition } from './utils';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const userAgentCommand = command as ESQLAstUserAgentCommand;
  const position = getPosition(userAgentCommand, cursorPosition);

  switch (position) {
    case UserAgentPosition.AFTER_USER_AGENT_KEYWORD:
      return [];

    case UserAgentPosition.AFTER_TARGET_FIELD:
      return [];

    case UserAgentPosition.AFTER_ASSIGN:
      return [];

    case UserAgentPosition.AFTER_EXPRESSION:
      return [withCompleteItem, pipeCompleteItem];

    case UserAgentPosition.AFTER_WITH_KEYWORD:
      return [];

    case UserAgentPosition.WITHIN_OPTIONS:
      return [];

    case UserAgentPosition.AFTER_COMMAND:
      return [pipeCompleteItem];

    default:
      return [];
  }
}
