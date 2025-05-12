/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import { type ESQLAstCommand, walk } from '@kbn/esql-ast';
import type { ESQLFieldWithMetadata } from '../../../validation/types';
import { isColumnItem } from '../../../shared/helpers';

export const fieldsSuggestionsAfter = (
  command: ESQLAstCommand,
  previousCommandFields: ESQLFieldWithMetadata[],
  userDefinedColumns: ESQLFieldWithMetadata[]
) => {
  const columns: string[] = [];

  walk(command, {
    visitCommandOption: (node) => {
      const args = node.args.filter(isColumnItem);
      const breakdownColumns = args.map((arg) => arg.name);
      columns.push(...breakdownColumns);
    },
  });

  const columnsToKeep = previousCommandFields.filter((field) => {
    return columns.some((column) => column === field.name);
  });

  return uniqBy([...columnsToKeep, ...userDefinedColumns], 'name');
};
