/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLAstCommand, type ESQLCommandOption, walk } from '@kbn/esql-ast';
import type { ESQLRealField } from '../../../validation/types';
import { isColumnItem, isOptionItem } from '../../../shared/helpers';

export const fieldsSuggestionsAfter = (
  command: ESQLAstCommand,
  previousCommandFields: ESQLRealField[],
  userDefinedColumns: ESQLRealField[]
) => {
  const columns: ESQLRealField[] = [];

  walk(command, {
    visitCommand: (node) => {
      const optionArgs = node.args.filter((arg) => isOptionItem(arg) && arg.name === 'as');
      if (optionArgs.length) {
        const [optionArg] = optionArgs;
        const args = (optionArg as ESQLCommandOption).args.filter(isColumnItem);
        const asColumns = args.map((arg, index) => {
          // The first column is always a keyword, the second one is a double
          const type = index === 0 ? ('keyword' as const) : ('double' as const);
          return {
            name: arg.name,
            type,
          };
        });
        columns.push(...asColumns);
      } else {
        // If no AS clause is provided, use the default column names
        columns.push(
          {
            name: 'type',
            type: 'keyword' as const,
          },
          {
            name: 'pvalue',
            type: 'double' as const,
          }
        );
      }
    },
  });

  return [...previousCommandFields, ...columns];
};
