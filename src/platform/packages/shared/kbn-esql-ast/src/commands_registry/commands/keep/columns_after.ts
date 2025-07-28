/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { walk } from '../../../walker';
import { type ESQLCommand } from '../../../types';
import type { ESQLFieldWithMetadata } from '../../types';
import { ICommandContext } from '../../types';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLFieldWithMetadata[],
  context?: ICommandContext
) => {
  const columnsToKeep: string[] = [];

  walk(command, {
    visitColumn: (node) => {
      columnsToKeep.push(node.name);
    },
  });

  return previousColumns.filter((field) => {
    return columnsToKeep.some((column) => column === field.name);
  });
};
