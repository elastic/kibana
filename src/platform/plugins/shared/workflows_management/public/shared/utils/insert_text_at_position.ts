/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineColumnPosition } from '../../entities/workflows/store';

/**
 * Replaces text from the given position to the end of the line with the provided text.
 * Line and column are 1-based (Monaco convention).
 *
 * @param yamlString - The original YAML string
 * @param position - 1-based line number and column
 * @param text - The text to insert (replaces from position to end of line)
 * @returns The updated YAML string
 */
export function insertTextAtPosition(
  yamlString: string,
  position: LineColumnPosition,
  text: string
): string {
  if (!yamlString) {
    return yamlString;
  }
  const lines = yamlString.split('\n');
  const { lineNumber, column } = position;

  if (lineNumber < 1 || lineNumber > lines.length) {
    return yamlString;
  }

  const lineIndex = lineNumber - 1;
  const line = lines[lineIndex];
  const columnIndex = Math.max(0, column - 1);
  const endColumn = line.length;

  if (columnIndex >= endColumn) {
    lines[lineIndex] = line + text;
  } else {
    lines[lineIndex] = line.slice(0, columnIndex) + text;
  }

  return lines.join('\n');
}
