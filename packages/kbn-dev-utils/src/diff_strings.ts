/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import jestDiff from 'jest-diff';
import stripAnsi from 'strip-ansi';
import Chalk from 'chalk';

function reformatJestDiff(diff: string) {
  const diffLines = diff.split('\n');

  if (
    diffLines.length < 4 ||
    stripAnsi(diffLines[0]) !== '- Expected' ||
    stripAnsi(diffLines[1]) !== '+ Received'
  ) {
    throw new Error(`unexpected diff format: ${diff}`);
  }

  const outputLines = [diffLines.shift(), diffLines.shift(), diffLines.shift()];

  /**
   * buffer which contains between 0 and 5 lines from the diff which aren't additions or
   * deletions. The first three are the first three lines seen since the buffer was cleared
   * and the last two lines are the last two lines seen.
   *
   * When flushContext() is called we write the first two lines to output, an elipses if there
   * are five lines, and then the last two lines.
   *
   * At the very end we will write the last two lines of context if they're defined
   */
  const contextBuffer: string[] = [];

  /**
   * Convert a line to an empty line with elipses placed where the text on that line starts
   */
  const toElipses = (line: string) => {
    return stripAnsi(line).replace(/^(\s*).*/, '$1...');
  };

  while (diffLines.length) {
    const line = diffLines.shift()!;
    const plainLine = stripAnsi(line);
    if (plainLine.startsWith('+ ') || plainLine.startsWith('- ')) {
      // write contextBuffer to the outputLines
      if (contextBuffer.length) {
        outputLines.push(
          ...contextBuffer.slice(0, 2),
          ...(contextBuffer.length === 5
            ? [Chalk.dim(toElipses(contextBuffer[2])), ...contextBuffer.slice(3, 5)]
            : contextBuffer.slice(2, 4))
        );

        contextBuffer.length = 0;
      }

      // add this line to the outputLines
      outputLines.push(line);
    } else {
      // update the contextBuffer with this line which doesn't represent a change
      if (contextBuffer.length === 5) {
        contextBuffer[3] = contextBuffer[4];
        contextBuffer[4] = line;
      } else {
        contextBuffer.push(line);
      }
    }
  }

  if (contextBuffer.length) {
    outputLines.push(
      ...contextBuffer.slice(0, 2),
      ...(contextBuffer.length > 2 ? [Chalk.dim(toElipses(contextBuffer[2]))] : [])
    );
  }

  return outputLines.join('\n');
}

/**
 * Produces a diff string which is nicely formatted to show the differences between two strings. This will
 * be a multi-line string so it's generally a good idea to include a `\n` before this first line of the diff
 * if you are concatenating it with another message.
 */
export function diffStrings(expected: string, received: string) {
  const diff = jestDiff(expected, received);

  if (!diff || stripAnsi(diff) === 'Compared values have no visual difference.') {
    return undefined;
  }

  return reformatJestDiff(diff);
}
