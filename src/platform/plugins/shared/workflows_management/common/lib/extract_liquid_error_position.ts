/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Default length to extend error highlighting when exact boundaries cannot be determined
 */
const DEFAULT_ERROR_HIGHLIGHT_EXTENSION = 10;

/**
 * Extracts position information from liquidjs error messages
 * By default, liquidjs returns the start of the line of the error message
 * This function tries to pinpoint the specific problematic token rather than just the start of the expression
 */
export const extractLiquidErrorPosition = (
  text: string,
  errorMessage: string
): { start: number; end: number } => {
  // Try to find the specific problematic token from the error message
  const specificTokenPosition = findSpecificErrorToken(text, errorMessage);
  if (specificTokenPosition) {
    return specificTokenPosition;
  }

  // Parse liquidjs error format: "error description, line:X, col:Y"
  const lineColMatch = errorMessage.match(/line:(\d+),\s*col:(\d+)/);

  if (lineColMatch) {
    const line = parseInt(lineColMatch[1], 10);
    const col = parseInt(lineColMatch[2], 10);

    // Convert line/column to text offset
    const lines = text.split('\n');
    let offset = 0;

    // Add up lengths of previous lines
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline character
    }

    // Add column offset (liquidjs uses 1-based columns)
    offset += Math.max(0, col - 1);

    // Try to find the extent of the problematic liquid expression
    const remainingText = text.substring(offset);
    let end = offset + 1;

    // Look for liquid expression boundaries
    if (remainingText.startsWith('{{')) {
      const closeMatch = remainingText.indexOf('}}');
      end = offset + (closeMatch > -1 ? closeMatch + 2 : Math.min(50, remainingText.length));
    } else if (remainingText.startsWith('{%')) {
      const closeMatch = remainingText.indexOf('%}');
      end = offset + (closeMatch > -1 ? closeMatch + 2 : Math.min(50, remainingText.length));
    } else {
      // Find the end of the current word/expression
      const wordMatch = remainingText.match(/^\S+/);
      end = offset + (wordMatch ? wordMatch[0].length : DEFAULT_ERROR_HIGHLIGHT_EXTENSION);
    }

    return {
      start: Math.max(0, offset),
      end: Math.min(text.length, end),
    };
  }

  // Fallback: try to find any liquid-like pattern in the text
  const liquidPattern = /\{\{|\{\%/g;
  let match;
  while ((match = liquidPattern.exec(text)) !== null) {
    const start = match.index;
    const remaining = text.substring(start);
    const end = remaining.search(/\}\}|\%\}/) + start;
    return {
      start,
      end: end > start ? end + 2 : Math.min(start + 20, text.length),
    };
  }

  // Final fallback: highlight the first character
  return { start: 0, end: Math.min(1, text.length) };
};

/**
 * Tries to find the specific token causing the error based on error message patterns
 */
const findSpecificErrorToken = (
  text: string,
  errorMessage: string
): { start: number; end: number } | null => {
  // Pattern for undefined filter errors: "undefined filter: filterName"
  const filterMatch = errorMessage.match(/undefined filter:\s*([a-zA-Z_]\w*)/);
  if (filterMatch) {
    const filterName = filterMatch[1];
    // Look for the filter name after a pipe character
    const filterRegex = new RegExp(`\\|\\s*${filterName}\\b`, 'g');
    const match = filterRegex.exec(text);
    if (match) {
      const pipeIndex = match.index;
      const filterStart = text.indexOf(filterName, pipeIndex);
      return {
        start: filterStart,
        end: filterStart + filterName.length,
      };
    }
  }

  // Pattern for undefined tag errors: "tag 'tagName' not found"
  const tagMatch = errorMessage.match(/tag ['"](.*?)['"] not found/);
  if (tagMatch) {
    const tagName = tagMatch[1];
    const tagIndex = text.indexOf(tagName);
    if (tagIndex !== -1) {
      return {
        start: tagIndex,
        end: tagIndex + tagName.length,
      };
    }
  }

  // Pattern for unclosed tags: "output '{{ content' not closed" or "tag '{% content' not closed"
  const unclosedMatch = errorMessage.match(/(output|tag) ['"](\{\{.*?|\{\%.*?)['"] not closed/);
  if (unclosedMatch) {
    const content = unclosedMatch[2];
    const contentIndex = text.indexOf(content);
    if (contentIndex !== -1) {
      return {
        start: contentIndex,
        end: Math.min(
          contentIndex + content.length + DEFAULT_ERROR_HIGHLIGHT_EXTENSION,
          text.length
        ), // Extend a bit to show the unclosed part
      };
    }
  }

  // Pattern for invalid value expressions: "invalid value expression"
  if (errorMessage.includes('invalid value expression')) {
    // Look for empty expressions like {{ }}
    const emptyExpressionMatch = text.match(/\{\{\s*\}\}/);
    if (emptyExpressionMatch && emptyExpressionMatch.index !== undefined) {
      return {
        start: emptyExpressionMatch.index,
        end: emptyExpressionMatch.index + emptyExpressionMatch[0].length,
      };
    }
  }

  return null;
};
