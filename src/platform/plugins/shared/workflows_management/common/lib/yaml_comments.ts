/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Finds the character index within a single line where a YAML comment begins,
 * or `-1` if the line contains no comment. Tracks single- and double-quoted
 * regions so that `#` inside strings is not treated as a comment.
 *
 * YAML rule: a `#` preceded by whitespace (or at column 0) that is not inside
 * a quoted scalar starts a comment that extends to end of line.
 */
export const findInlineCommentStart = (line: string): number => {
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inDoubleQuote) {
      if (ch === '\\') {
        i++;
      } else if (ch === '"') {
        inDoubleQuote = false;
      }
    } else if (inSingleQuote) {
      if (ch === "'" && i + 1 < line.length && line[i + 1] === "'") {
        i++;
      } else if (ch === "'") {
        inSingleQuote = false;
      }
    } else if (ch === '"') {
      inDoubleQuote = true;
    } else if (ch === "'") {
      inSingleQuote = true;
    } else if (ch === '#' && (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t')) {
      return i;
    }
  }

  return -1;
};

/**
 * Checks whether the given offset falls within a YAML comment — either a
 * whole-line comment or an inline comment after a value.
 */
export const isOffsetInYamlComment = (text: string, offset: number): boolean => {
  let lineStart = offset;
  while (lineStart > 0 && text[lineStart - 1] !== '\n') {
    lineStart--;
  }

  let lineEnd = offset;
  while (lineEnd < text.length && text[lineEnd] !== '\n') {
    lineEnd++;
  }

  const line = text.slice(lineStart, lineEnd);
  const commentStart = findInlineCommentStart(line);
  if (commentStart === -1) {
    return false;
  }

  const offsetInLine = offset - lineStart;
  return offsetInLine >= commentStart;
};

/**
 * Replaces the content of YAML comments (whole-line and inline) with spaces,
 * preserving string length and line count so that offset-based error positions
 * remain valid.
 */
export const stripYamlCommentLines = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      const commentStart = findInlineCommentStart(line);
      if (commentStart === -1) {
        return line;
      }
      return line.slice(0, commentStart) + ' '.repeat(line.length - commentStart);
    })
    .join('\n');
