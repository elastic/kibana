/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstAllCommands, ESQLCommandOption } from '@elastic/esql/types';
export type LimitCaretPosition = 'after_limit_keyword' | 'after_value' | 'grouping_expression';
export declare function getPosition(
  command: ESQLAstAllCommands,
  innerText: string
): LimitCaretPosition;
export declare function getByOption(command: ESQLAstAllCommands): ESQLCommandOption | undefined;
export declare function getByColumns(byNode: ESQLCommandOption | undefined): string[];
