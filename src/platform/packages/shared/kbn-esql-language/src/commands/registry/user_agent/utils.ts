/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstUserAgentCommand } from '@elastic/esql/types';
import { isMap } from '@elastic/esql';
import { EDITOR_MARKER } from '../../definitions/constants';

export enum UserAgentPosition {
  AFTER_USER_AGENT_KEYWORD = 'after_user_agent_keyword',
  AFTER_TARGET_FIELD = 'after_target_field', // prefix typed, before '='
  AFTER_ASSIGN = 'after_assign', // after '=', before expression is typed
  AFTER_EXPRESSION = 'after_expression', // expression complete
  AFTER_WITH_KEYWORD = 'after_with_keyword',
  WITHIN_OPTIONS = 'within_options',
  AFTER_COMMAND = 'after_command',
}

export function getPosition(
  command: ESQLAstUserAgentCommand,
  cursorPosition: number
): UserAgentPosition {
  const { targetField, expression, namedParameters } = command;

  if (namedParameters !== undefined) {
    const map = isMap(namedParameters) ? namedParameters : undefined;
    if (!map || (map.incomplete && !map.text)) return UserAgentPosition.AFTER_WITH_KEYWORD;
    if (map.incomplete) {
      const cursorIsAfterMap =
        map.text.trimEnd().endsWith('}') && cursorPosition > map.location.max;
      return cursorIsAfterMap ? UserAgentPosition.AFTER_COMMAND : UserAgentPosition.WITHIN_OPTIONS;
    }
    return UserAgentPosition.AFTER_COMMAND;
  }

  if (expression !== undefined) {
    if (expression.text === EDITOR_MARKER || expression.incomplete) {
      return UserAgentPosition.AFTER_ASSIGN;
    }
    return UserAgentPosition.AFTER_EXPRESSION;
  }

  if (targetField && !targetField.incomplete) {
    return UserAgentPosition.AFTER_TARGET_FIELD;
  }

  return UserAgentPosition.AFTER_USER_AGENT_KEYWORD;
}
