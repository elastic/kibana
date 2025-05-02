/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  type ESQLAstCommand,
  walk,
  type ESQLAstRenameExpression,
  type ESQLAstBaseItem,
} from '@kbn/esql-ast';
import type { ESQLFieldWithMetadata } from '../../../validation/types';
import { isOptionItem } from '../../../shared/helpers';

export const fieldsSuggestionsAfter = (
  command: ESQLAstCommand,
  previousCommandFields: ESQLFieldWithMetadata[],
  userDefinedColumns: ESQLFieldWithMetadata[]
) => {
  const currentColumns: string[] = [];
  const renamePairs: ESQLAstRenameExpression[] = [];

  walk(command, {
    visitColumn: (node) => {
      currentColumns.push(node.name);
    },
  });

  walk(command, {
    visitCommand: (node) => {
      const args = node.args.filter((arg) => isOptionItem(arg) && arg.name === 'as');
      renamePairs.push(...(args as ESQLAstRenameExpression[]));
    },
  });

  // rename the columns with the user defined name
  return previousCommandFields.map((oldColumn) => {
    const renamePair = renamePairs.find(
      (pair) =>
        pair.args && pair.args[0] && (pair.args[0] as ESQLAstBaseItem).name === oldColumn.name
    );

    if (renamePair && renamePair.args && renamePair.args[1]) {
      return { name: (renamePair.args[1] as ESQLAstBaseItem).name, type: oldColumn.type };
    } else {
      return oldColumn; // No rename found, keep the old name
    }
  });
};
