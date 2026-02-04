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
import { walk } from '../../../ast/walker';
import type { ESQLColumnData } from '../types';
import { extractSemanticsFromGrok, unquoteTemplate, type GrokColumn } from './utils';

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

  const uniqueColumns = uniqBy(columns, 'name');
  return [
    ...previousColumns,
    ...uniqueColumns.map(
      (column) =>
        ({
          name: column.name,
          type: column.type,
          userDefined: false,
        } as ESQLColumnData)
    ),
  ];
};
