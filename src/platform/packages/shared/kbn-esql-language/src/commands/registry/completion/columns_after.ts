/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import uniqBy from 'lodash/uniqBy';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { LeafPrinter } from '../../../pretty_print/leaf_printer';
import { type ESQLAstCompletionCommand, type ESQLCommand } from '../../../types';
import type { ESQLColumnData, ESQLUserDefinedColumn } from '../types';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string
) => {
  const { targetField } = command as ESQLAstCompletionCommand;

  return uniqBy(
    [
      ...previousColumns,
      targetField
        ? ({
            name: LeafPrinter.column(targetField),
            type: 'keyword' as const,
            userDefined: true,
            location: targetField.location,
          } as ESQLUserDefinedColumn)
        : ({
            name: 'completion',
            type: 'keyword' as const,
            userDefined: false,
          } as ESQLFieldWithMetadata),
    ],
    'name'
  );
};
