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
    let commandStartLineNumber = -1;
    let commandEndLineNumber = -1;
    let commandMinChar = -1;
    let commandMaxChar = -1;
  
    const searchString = command;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerCaseLine = line.toLowerCase();
      const fromIndex = lowerCaseLine.indexOf(searchString);
  
      if (fromIndex !== -1) {
        commandStartLineNumber = i + 1;
        commandEndLineNumber = i + 1; // command is on a single line
        commandMinChar = fromIndex;
        commandMaxChar = fromIndex + searchString.length + 1;
        break; // Stop after finding the first command
      }
    }
  
    return {
      startLineNumber: commandStartLineNumber,
      endLineNumber: commandEndLineNumber,
      min: commandMinChar,
      max: commandMaxChar,
    };
  }
  