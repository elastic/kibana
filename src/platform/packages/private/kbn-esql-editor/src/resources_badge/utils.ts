/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
export function findCommandStringPosition(query: string, command: string) {
    const lines = query.split('\n');
    let fromStartLineNumber = -1;
    let fromEndLineNumber = -1;
    let fromMinChar = -1;
    let fromMaxChar = -1;
  
    const searchString = command;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerCaseLine = line.toLowerCase();
      const fromIndex = lowerCaseLine.indexOf(searchString);
  
      if (fromIndex !== -1) {
        fromStartLineNumber = i + 1;
        fromEndLineNumber = i + 1; // "FROM" is on a single line
        fromMinChar = fromIndex;
        fromMaxChar = fromIndex + searchString.length + 1;
        break; // Stop after finding the first "FROM"
      }
    }
  
    return {
      startLineNumber: fromStartLineNumber,
      endLineNumber: fromEndLineNumber,
      min: fromMinChar,
      max: fromMaxChar,
    };
  }
  