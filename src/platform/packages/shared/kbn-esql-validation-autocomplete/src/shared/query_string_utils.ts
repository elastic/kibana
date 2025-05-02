/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { parse, BasicPrettyPrinter } from '@kbn/esql-ast';

export function removeLastPipe(inputString: string): string {
  const { root } = parse(inputString);
  const queryNoComments = BasicPrettyPrinter.print(root);
  const lastPipeIndex = queryNoComments.lastIndexOf('|');
  if (lastPipeIndex !== -1) {
    return queryNoComments.substring(0, lastPipeIndex).trimEnd();
  }
  return queryNoComments.trimEnd();
}

export function processPipes(inputString: string) {
  const { root } = parse(inputString);
  const queryNoComments = BasicPrettyPrinter.print(root);
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
  const { root } = parse(inputString);
  const queryNoComments = BasicPrettyPrinter.print(root);
  return queryNoComments
    .split('|')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' | ');
}

export function getFirstPipeValue(inputString: string): string {
  const { root } = parse(inputString);
  const firstCommand = root.commands[0];
  return BasicPrettyPrinter.command(firstCommand);
}
