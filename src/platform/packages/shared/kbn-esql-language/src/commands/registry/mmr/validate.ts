/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstAllCommands, ESQLCommand, ESQLMessage } from '../../../types';
import type { ICommandContext } from '../types';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLCommand[],
  context?: ICommandContext
): ESQLMessage[] => {
  // validate types of fields in MMR command, e.g. query vector should be a dense vector, limit should be a number, options should be an object with valid keys and values, etc.
  // validate required fields are present, e.g. on, field, limit, number
  return [];
};
