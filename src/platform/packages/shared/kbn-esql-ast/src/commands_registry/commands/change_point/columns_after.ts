/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import uniqBy from 'lodash/uniqBy';
import { type ESQLCommand, type ESQLAstChangePointCommand } from '../../../types';
import { LeafPrinter } from '../../../pretty_print/leaf_printer';
import type { ESQLFieldWithMetadata } from '../../types';
import { ICommandContext } from '../../types';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLFieldWithMetadata[],
  context?: ICommandContext
) => {
  const { target } = command as ESQLAstChangePointCommand;

  return uniqBy(
    [
      ...previousColumns,
      {
        name: target ? LeafPrinter.column(target.type) : 'type',
        type: 'keyword' as const,
      },
      {
        name: target ? LeafPrinter.column(target.pvalue) : 'pvalue',
        type: 'double' as const,
      },
    ],
    'name'
  );
};
