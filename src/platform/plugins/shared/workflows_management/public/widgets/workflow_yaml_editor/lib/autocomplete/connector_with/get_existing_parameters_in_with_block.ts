/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { getIndentLevel } from '../../get_indent_level';

/**
 * Get existing parameters in the current with block to avoid suggesting duplicates
 */
export function getExistingParametersInWithBlock(
  model: monaco.editor.ITextModel,
  position: monaco.Position
): Set<string> {
  const existingParams = new Set<string>();
  const currentLineNumber = position.lineNumber;
  const currentLine = model.getLineContent(currentLineNumber);
  const currentIndent = getIndentLevel(currentLine);

  // Finding existing parameters in with block

  // First, find the start of the with block
  let withLineNumber = -1;
  let withIndent = -1;

  for (let lineNumber = currentLineNumber; lineNumber >= 1; lineNumber--) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);

    if (line.trim() === 'with:' || line.trim().endsWith('with:')) {
      // Make sure this with: is at a level that makes sense for our current position
      if (
        lineIndent < currentIndent ||
        (lineIndent === currentIndent && lineNumber < currentLineNumber)
      ) {
        withLineNumber = lineNumber;
        withIndent = lineIndent;
        // Found with block start
        break;
      }
    }

    // Stop if we hit a step boundary
    if (line.match(/^\s*-\s+name:/) || line.match(/^\s*steps:/)) {
      break;
    }
  }

  if (withLineNumber === -1) {
    // No with block found
    return existingParams;
  }

  // Now scan from the with line forward to collect existing parameters
  // Be more flexible with indentation - parameters should be indented MORE than with:

  for (let lineNumber = withLineNumber + 1; lineNumber <= model.getLineCount(); lineNumber++) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);

    // Stop if we've gone past the with block (less or equal indentation to with:)
    if (line.trim() !== '' && lineIndent <= withIndent) {
      // Exited with block due to indentation
      break;
    }

    // Look for parameters at any indentation level greater than with:
    // This handles both 2-space and 4-space indentation styles
    if (lineIndent > withIndent && line.trim() !== '') {
      // More flexible regex that handles various parameter name formats
      const paramMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        existingParams.add(paramName);
        // console.log(`Found existing parameter: ${paramName} at line ${lineNumber}`);
      }
    }

    // Stop if we hit another step
    if (line.match(/^\s*-\s+name:/)) {
      // Hit next step
      break;
    }
  }

  // console.log('Existing parameters found:', Array.from(existingParams));
  return existingParams;
}
