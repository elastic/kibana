/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
export function removeComments(text: string): string {
  // Remove single-line comments
  const withoutSingleLineComments = text.replace(/\/\/.*?(?:\r\n|\r|\n|$)/gm, '');
  // Remove multi-line comments
  const withoutMultiLineComments = withoutSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutMultiLineComments.trim();
}

export function removeLastPipe(inputString: string): string {
  const queryNoComments = removeComments(inputString);
  const lastPipeIndex = queryNoComments.lastIndexOf('|');
  if (lastPipeIndex !== -1) {
    return queryNoComments.substring(0, lastPipeIndex).trimEnd();
  }
  return queryNoComments.trimEnd();
}

export function processPipes(inputString: string) {
  const queryNoComments = removeComments(inputString);
  const parts = queryNoComments.split('|');
  const results = [];
  let currentString = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (i === 0) {
      currentString = part;
    } else {
      currentString += ' | ' + part;
    }
    results.push(currentString.trim());
  }
  return results;
}

export function toSingleLine(inputString: string): string {
  const queryNoComments = removeComments(inputString);
  return queryNoComments
    .split('|')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' | ');
}
