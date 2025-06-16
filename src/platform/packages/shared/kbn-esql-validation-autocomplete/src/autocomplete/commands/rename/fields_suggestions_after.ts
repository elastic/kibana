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
import uniqBy from 'lodash/uniqBy';
import type { ESQLFieldWithMetadata } from '../../../validation/types';
import { isOptionItem } from '../../../shared/helpers';

export const fieldsSuggestionsAfter = (
  command: ESQLAstCommand,
  previousCommandFields: ESQLFieldWithMetadata[],
  userDefinedColumns: ESQLFieldWithMetadata[]
) => {
  const asRenamePairs: ESQLAstRenameExpression[] = [];
  const assignRenamePairs: ESQLAstRenameExpression[] = [];

  walk(command, {
    visitCommand: (node) => {
      for (const arg of node.args) {
        if (isOptionItem(arg)) {
          if (arg.name === 'as') {
            asRenamePairs.push(arg as ESQLAstRenameExpression);
          } else if (arg.name === '=') {
            assignRenamePairs.push(arg as ESQLAstRenameExpression);
          }
        }
      }
    },
  });

  // rename the columns with the user defined name
  const newFields = previousCommandFields.map((oldColumn) => {
    const asRenamePair = asRenamePairs.find(
      (pair) => (pair?.args?.[0] as ESQLAstBaseItem)?.name === oldColumn.name
    );

    if (asRenamePair?.args?.[1]) {
      return { name: (asRenamePair.args[1] as ESQLAstBaseItem).name, type: oldColumn.type };
    }

    const assignRenamePair = assignRenamePairs.find(
      (pair) => (pair?.args?.[1] as ESQLAstBaseItem)?.name === oldColumn.name
    );

    if (assignRenamePair?.args?.[0]) {
      return { name: (assignRenamePair.args[0] as ESQLAstBaseItem).name, type: oldColumn.type };
    }

    return oldColumn; // No rename found, keep the old name
  });

  return uniqBy(newFields, 'name');
};
