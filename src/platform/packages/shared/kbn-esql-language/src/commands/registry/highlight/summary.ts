/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstHighlightCommand, ESQLCommand } from '@elastic/esql/types';
import type { ESQLCommandSummary } from '../types';
import { getHighlightColumnNames } from './utils';

export const summary = (command: ESQLCommand, _query: string): ESQLCommandSummary => {
  const highlightCommand = command as ESQLAstHighlightCommand;
  return { newColumns: new Set(getHighlightColumnNames(highlightCommand)) };
};
