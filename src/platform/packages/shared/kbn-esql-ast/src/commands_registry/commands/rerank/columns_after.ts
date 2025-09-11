/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import uniqBy from 'lodash/uniqBy';
import { LeafPrinter } from '../../../pretty_print/leaf_printer';
import type { ESQLCommand, ESQLAstRerankCommand } from '../../../types';
import type { ESQLColumnData } from '../../types';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string
) => {
  const { targetField } = command as ESQLAstRerankCommand;

  if (targetField) {
    const newColumn = {
      name: LeafPrinter.column(targetField),
      type: 'double' as const,
      userDefined: true,
      location: targetField.location,
    };
    return uniqBy([newColumn, ...previousColumns], 'name');
  }

  return previousColumns;
};
