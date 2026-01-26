/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '../../../types';
import type { ESQLCommandSummary } from '../types';
import { walk } from '../../../ast/walker';
import { unquoteTemplate, extractDissectColumnNames } from './utils';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const newColumns: string[] = [];
  walk(command, {
    visitLiteral: (node) => {
      const dissectPattern = unquoteTemplate(String(node.value));
      newColumns.push(...extractDissectColumnNames(dissectPattern));
    },
  });

  return { newColumns: new Set(newColumns) };
};
