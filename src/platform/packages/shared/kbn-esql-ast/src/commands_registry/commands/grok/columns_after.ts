/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLCommand } from '../../../types';
import { walk } from '../../../walker';
import type { ESQLColumnData } from '../../types';

function unquoteTemplate(inputString: string): string {
  if (inputString.startsWith('"') && inputString.endsWith('"') && inputString.length >= 2) {
    return inputString.substring(1, inputString.length - 1);
  }
  return inputString;
}

export function extractSemanticsFromGrok(pattern: string): string[] {
  const columns: string[] = [];

  // Regex for Grok's %{SYNTAX:SEMANTIC} pattern
  const grokSyntaxRegex = /%{\w+:(?<column>[\w@]+)(?::\w+)?}/g;
  let grokMatch;
  while ((grokMatch = grokSyntaxRegex.exec(pattern)) !== null) {
    if (grokMatch?.groups?.column) {
      columns.push(grokMatch.groups.column);
    }
  }

  // Regex for Oniguruma-style named capture groups (?<name>...) or (?'name'...)
  // Oniguruma supports both `?<name>` and `?'name'` for named capture groups.
  const onigurumaNamedCaptureRegex = /(?<column>\(\?<(\w+)>|\(\?'(\w+)'\)[^)]*\))/g;
  let onigurumaMatch;
  while ((onigurumaMatch = onigurumaNamedCaptureRegex.exec(pattern)) !== null) {
    // If it's a (?<name>...) style
    if (onigurumaMatch[2]) {
      columns.push(onigurumaMatch[2]);
    }
    // If it's a (?'name'...) style
    else if (onigurumaMatch[3]) {
      columns.push(onigurumaMatch[3]);
    }
  }
  // Remove duplicates
  return [...new Set(columns)];
}

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string
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
    ...columns.map(
      (column) => ({ name: column, type: 'keyword' as const, userDefined: false } as ESQLColumnData)
    ),
  ];
};
