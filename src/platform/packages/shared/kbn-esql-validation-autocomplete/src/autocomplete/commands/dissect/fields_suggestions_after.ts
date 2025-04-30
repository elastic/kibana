/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLAstCommand, walk } from '@kbn/esql-ast';
import type { ESQLRealField } from '../../../validation/types';

function unquoteTemplate(inputString: string): string {
  if (inputString.startsWith('"') && inputString.endsWith('"') && inputString.length >= 2) {
    return inputString.substring(1, inputString.length - 1);
  }
  return inputString;
}

export function extractDissectColumnNames(pattern: string): string[] {
  const regex = /%\{(?:[?+]?)?([^}]+?)(?:->)?\}/g;
  const matches = pattern.matchAll(regex);
  const columns: string[] = [];
  for (const match of matches) {
    if (match && match[1]) {
      const columnName = match[1];
      if (!columns.includes(columnName)) {
        columns.push(columnName);
      }
    }
  }
  return columns;
}

export const fieldsSuggestionsAfter = (
  command: ESQLAstCommand,
  previousCommandFields: ESQLRealField[],
  userDefinedColumns: ESQLRealField[]
) => {
  const columns: string[] = [];

  walk(command, {
    visitLiteral: (node) => {
      const dissectPattern = unquoteTemplate(String(node.value));
      columns.push(...extractDissectColumnNames(dissectPattern));
    },
  });

  return [
    ...previousCommandFields,
    ...columns.map((column) => ({ name: column, type: 'keyword' as const })),
  ];
};
