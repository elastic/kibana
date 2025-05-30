/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLAstCommand, type ESQLAstChangePointCommand, LeafPrinter } from '@kbn/esql-ast';
import type { ESQLFieldWithMetadata } from '../../../validation/types';

export const fieldsSuggestionsAfter = (
  command: ESQLAstCommand,
  previousCommandFields: ESQLFieldWithMetadata[],
  userDefinedColumns: ESQLFieldWithMetadata[]
) => {
  const { target } = command as ESQLAstChangePointCommand;
  previousCommandFields.push(
    {
      name: target ? LeafPrinter.column(target.type) : 'type',
      type: 'keyword' as const,
    },
    {
      name: target ? LeafPrinter.column(target.pvalue) : 'pvalue',
      type: 'double' as const,
    }
  );
  return previousCommandFields;
};
