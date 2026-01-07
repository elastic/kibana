/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommandOption, ESQLCommand } from '../../../types';
import type { ESQLCommandSummary } from '../types';
import { isColumn, isOptionNode } from '../../../ast';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const metadataOption = command.args.find(
    (arg) => isOptionNode(arg) && arg.name === 'metadata'
  ) as ESQLCommandOption | undefined;

  if (!metadataOption) {
    return { newColumns: new Set<string>(), metadataColumns: new Set<string>() };
  }

  return {
    newColumns: new Set<string>(),
    metadataColumns: new Set(metadataOption.args.filter(isColumn).map(({ name }) => name)),
  };
};
