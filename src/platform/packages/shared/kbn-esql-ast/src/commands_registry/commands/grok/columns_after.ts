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

function unquoteTemplate(inputString: string): string {
  if (inputString.startsWith('"') && inputString.endsWith('"') && inputString.length >= 2) {
    return inputString.substring(1, inputString.length - 1);
  }
  return inputString;
}

export function extractSemanticsFromGrok(pattern: string): string[] {
  const regex = /%\{\w+:(?<column>[\w@]+)\}/g;
  const matches = pattern.matchAll(regex);
  const columns: string[] = [];
  for (const match of matches) {
    if (match?.groups?.column) {
      columns.push(match.groups.column);
    }
  }
  return columns;
}

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLFieldWithMetadata[],
  context?: ICommandContext
) => {
  const columns: string[] = [];

  walk(command, {
    visitLiteral: (node) => {
      const grokRegex = unquoteTemplate(String(node.value));
      columns.push(...extractSemanticsFromGrok(grokRegex));
    },
  });

  return [
    ...previousColumns,
    ...columns.map((column) => ({ name: column, type: 'keyword' as const })),
  ];
};
