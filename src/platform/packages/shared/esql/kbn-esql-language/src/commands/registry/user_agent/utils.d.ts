/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstUserAgentCommand } from '@elastic/esql/types';
export declare enum UserAgentPosition {
  AFTER_USER_AGENT_KEYWORD = 'after_user_agent_keyword',
  AFTER_TARGET_FIELD = 'after_target_field', // prefix typed, before '='
  AFTER_ASSIGN = 'after_assign', // after '=', before expression is typed
  AFTER_EXPRESSION = 'after_expression', // expression complete
  AFTER_WITH_KEYWORD = 'after_with_keyword',
  WITHIN_OPTIONS = 'within_options',
  WITHIN_PROPERTIES_ARRAY = 'within_properties_array',
  AFTER_COMMAND = 'after_command',
}
export declare function getPosition(
  command: ESQLAstUserAgentCommand,
  cursorPosition: number
): UserAgentPosition;
