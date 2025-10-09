/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';

/**
 * Simple mock for monaco model, partially compatible with the real model to be use in tests
 * @param yamlContent - The yaml content to create the model from
 * @returns The mock monaco model with getLineCount, getOffsetAt, getPositionAt, getLineContent, pushEditOperations methods
 */
export function createMockModel(yamlContent: string) {
  const lines = yamlContent.split('\n');

  return {
    getLineCount: () => lines.length,
    getOffsetAt: (position: monaco.Position) => {
      let offset = 0;
      for (let i = 0; i < position.lineNumber - 1; i++) {
        offset += lines[i].length + 1;
      }
      offset += position.column - 1;
      return offset;
    },
    getPositionAt: (offset: number) => {
      // Simple implementation: convert offset to line/column
      let currentOffset = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline
        if (currentOffset + lineLength > offset) {
          return {
            lineNumber: i + 1,
            column: offset - currentOffset + 1,
          };
        }
        currentOffset += lineLength;
      }
      return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
    },
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] || '',
    pushEditOperations: jest.fn(),
  };
}
