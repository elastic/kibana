/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import { type ESQLCommand } from '../../../types';
import type { GrokDataType, FieldType } from '../../../definitions/types';
import { walk } from '../../../walker';
import type { ESQLColumnData } from '../../types';

function unquoteTemplate(inputString: string): string {
  if (inputString.startsWith('"') && inputString.endsWith('"') && inputString.length >= 2) {
    return inputString.substring(1, inputString.length - 1);
  }
  return inputString;
}

interface GrokColumn {
  name: string;
  type: string;
}

export function extractSemanticsFromGrok(pattern: string): GrokColumn[] {
  const columns: GrokColumn[] = [];

  // Regex for Grok's %{SYNTAX:SEMANTIC:TYPE} pattern
  const grokSyntaxRegex = /%{\w+:(?<column>[\w@]+)(?::(?<type>\w+))?}/g;
  let grokMatch;
  while ((grokMatch = grokSyntaxRegex.exec(pattern)) !== null) {
    if (grokMatch?.groups?.column) {
      columns.push({
        name: grokMatch.groups.column,
        type: grokMatch.groups.type
          ? grokTypeToESQLFieldType(grokMatch.groups.type as GrokDataType)
          : 'keyword',
      });
    }
  }

  // Regex for Oniguruma-style named capture groups (?<name>...) or (?'name'...)
  // Oniguruma supports both `?<name>` and `?'name'` for named capture groups.
  const onigurumaNamedCaptureRegex = /(?<column>\(\?<(\w+)>|\(\?'(\w+)'\)[^)]*\))/g;
  let onigurumaMatch;
  while ((onigurumaMatch = onigurumaNamedCaptureRegex.exec(pattern)) !== null) {
    // If it's a (?<name>...) style
    if (onigurumaMatch[2]) {
      columns.push({ name: onigurumaMatch[2], type: 'keyword' });
    }
    // If it's a (?'name'...) style
    else if (onigurumaMatch[3]) {
      columns.push({ name: onigurumaMatch[3], type: 'keyword' });
    }
  }

  // Remove duplicates by name
  return uniqBy(columns, 'name');
}

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  _query: string
) => {
  const columns: GrokColumn[] = [];

  walk(command, {
    visitLiteral: (node) => {
      const grokRegex = unquoteTemplate(String(node.value));
      columns.push(...extractSemanticsFromGrok(grokRegex));
    },
  });

  return [
    ...previousColumns,
    ...columns.map(
      (column) =>
        ({
          name: column.name,
          type: column.type,
          userDefined: false,
        } as ESQLColumnData)
    ),
  ];
};

function grokTypeToESQLFieldType(grokType: GrokDataType): FieldType {
  switch (grokType) {
    case 'int':
      return 'integer';
    case 'long':
      return 'long';
    case 'double':
    case 'float':
      return 'double';
    case 'boolean':
      return 'boolean';
    default:
      return 'keyword';
  }
}
