/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { createWorkflowLiquidEngine } from '@kbn/workflows';

const liquidEngine = createWorkflowLiquidEngine({
  strictFilters: false,
  strictVariables: false,
});

export interface TemplateExpressionInfo {
  /** Whether cursor is inside a template expression */
  isInsideTemplate: boolean;
  /** The full template expression text (without {{ }}) including filters */
  expression: string;
  /** The variable path before filters (e.g., 'steps.stepA.output') */
  variablePath: string;
  /** The path segments (e.g., ['steps', 'stepA', 'output', 'bla']) */
  pathSegments: string[];
  /** The segment index that the cursor is on (e.g., 2 for 'output') */
  cursorSegmentIndex: number;
  /** The partial path up to cursor position (e.g., ['steps', 'stepA', 'output']) */
  pathUpToCursor: string[];
  /** Range of the template expression in the editor */
  templateRange: monaco.Range;
  /** Filters applied to the expression (e.g., ['json', 'upcase']) */
  filters: string[];
  /** Whether the cursor is on a filter (not the variable path) */
  isOnFilter: boolean;
}

/**
 * Parse template expression at the given cursor position
 * Uses LiquidJS tokenizer to detect template expressions
 */
export function parseTemplateAtPosition(
  model: monaco.editor.ITextModel,
  position: monaco.Position
): TemplateExpressionInfo | null {
  const lineContent = model.getLineContent(position.lineNumber);
  const cursorOffset = position.column - 1; // Monaco columns are 1-based
  try {
    // Use LiquidJS to tokenize the line
    const tokens = liquidEngine.parse(lineContent);
    // Find output tokens ({{ }}) that contain the cursor position
    for (const token of tokens) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenAny = token as any;
      // Check if this is an Output token ({{ }})
      // The constructor name is "Output" not "OutputToken"
      if (tokenAny.constructor.name === 'Output') {
        // Check if cursor is within this token's range
        // The begin/end positions are in tokenAny.token (the OutputToken)
        const tokenStart = tokenAny.token.begin;
        const tokenEnd = tokenAny.token.end;
        if (cursorOffset >= tokenStart && cursorOffset <= tokenEnd) {
          // Extract the expression content using contentRange for the actual content (without {{ }})
          // contentRange gives us the range of just the expression inside the braces
          const contentRange = tokenAny.token.contentRange;
          const expression = contentRange
            ? lineContent.substring(contentRange[0], contentRange[1])
            : lineContent.substring(tokenStart + 2, tokenEnd - 2).trim();
          // Extract the variable path (before any filters) and filters
          const pipeIndex = expression.indexOf('|');
          const variablePath =
            pipeIndex >= 0 ? expression.substring(0, pipeIndex).trim() : expression.trim();
          const filtersString = pipeIndex >= 0 ? expression.substring(pipeIndex + 1).trim() : '';
          const filters = filtersString
            ? filtersString.split('|').map((f) => f.trim().split(':')[0].trim())
            : [];
          if (!variablePath) {
            return null;
          }

          // Parse path segments using LiquidJS
          const pathSegments = parsePathSegments(variablePath);
          if (pathSegments.length === 0) {
            return null;
          }

          // Calculate cursor position within the expression
          const expressionStart = tokenStart + 2; // After {{
          let contentStart = expressionStart;
          while (contentStart < lineContent.length && lineContent[contentStart] === ' ') {
            contentStart++;
          }

          const cursorInExpression = cursorOffset - contentStart;

          // Check if cursor is on the filter part or the variable path
          // Find where the pipe character is in the original expression
          const pipePositionInExpression = expression.indexOf('|');
          const isOnFilter =
            pipePositionInExpression >= 0 && cursorInExpression >= pipePositionInExpression;

          const cursorSegmentIndex = findSegmentAtCursor(variablePath, cursorInExpression);
          const pathUpToCursor = pathSegments.slice(0, cursorSegmentIndex + 1);

          // Calculate the range for highlighting
          let pathRange: monaco.Range;
          if (isOnFilter) {
            // Hovering on filter - highlight the entire expression including filters
            pathRange = new monaco.Range(
              position.lineNumber,
              contentStart + 1,
              position.lineNumber,
              contentStart + expression.length + 1
            );
          } else {
            // Hovering on variable path - highlight just the path up to cursor
            pathRange =
              calculatePathRangeUpToCursor(
                variablePath,
                cursorSegmentIndex,
                contentStart,
                position.lineNumber
              ) ||
              new monaco.Range(
                position.lineNumber,
                contentStart + 1,
                position.lineNumber,
                contentStart + variablePath.length + 1
              );
          }

          const result = {
            isInsideTemplate: true,
            expression,
            variablePath,
            pathSegments,
            cursorSegmentIndex,
            pathUpToCursor,
            templateRange: pathRange,
            filters,
            isOnFilter,
          };

          return result;
        }
      }
    }
  } catch (error) {
    // If LiquidJS parsing fails, fall back to simple regex detection
    return parseTemplateWithRegex(model, position, lineContent, cursorOffset);
  }

  return null;
}

/**
 * Fallback regex-based parser for when LiquidJS fails
 */
function parseTemplateWithRegex(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  lineContent: string,
  cursorOffset: number
): TemplateExpressionInfo | null {
  const templateRegex = /\{\{\s*([^}]*?)\s*\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = templateRegex.exec(lineContent)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    if (cursorOffset >= matchStart && cursorOffset <= matchEnd) {
      const expression = match[1].trim();
      const pipeIndex = expression.indexOf('|');
      const variablePath = pipeIndex >= 0 ? expression.substring(0, pipeIndex).trim() : expression;
      const filtersString = pipeIndex >= 0 ? expression.substring(pipeIndex + 1).trim() : '';
      const filters = filtersString
        ? filtersString.split('|').map((f) => f.trim().split(':')[0].trim())
        : [];

      const pathSegments = parsePathSegments(variablePath);

      if (pathSegments.length === 0) {
        return null;
      }

      const templateContentStart = matchStart + 2;
      let contentStart = templateContentStart;
      while (contentStart < lineContent.length && lineContent[contentStart] === ' ') {
        contentStart++;
      }

      const cursorInExpression = cursorOffset - contentStart;
      const variablePathEndInExpression = variablePath.length;
      const isOnFilter = cursorInExpression > variablePathEndInExpression;
      const cursorSegmentIndex = findSegmentAtCursor(variablePath, cursorInExpression);
      const pathUpToCursor = pathSegments.slice(0, cursorSegmentIndex + 1);

      return {
        isInsideTemplate: true,
        expression,
        variablePath,
        pathSegments,
        cursorSegmentIndex,
        pathUpToCursor,
        templateRange: new monaco.Range(
          position.lineNumber,
          matchStart + 1,
          position.lineNumber,
          matchEnd + 1
        ),
        filters,
        isOnFilter,
      };
    }
  }

  return null;
}

/**
 * Parse path segments from a variable path string
 * Handles dot notation and bracket notation
 * e.g., "steps.stepA.output.bla" -> ["steps", "stepA", "output", "bla"]
 * e.g., "steps['stepA'].output" -> ["steps", "stepA", "output"]
 */
function parsePathSegments(path: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inBracket = false;
  let quoteChar: string | null = null;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (inBracket) {
      if (quoteChar) {
        if (char === quoteChar) {
          quoteChar = null;
        } else {
          current += char;
        }
      } else if (char === '"' || char === "'") {
        quoteChar = char;
      } else if (char === ']') {
        inBracket = false;
        if (current) {
          segments.push(current);
          current = '';
        }
      } else if (char !== ' ') {
        current += char;
      }
    } else {
      if (char === '[') {
        if (current) {
          segments.push(current);
          current = '';
        }
        inBracket = true;
      } else if (char === '.') {
        if (current) {
          segments.push(current);
          current = '';
        }
      } else if (char !== ' ') {
        current += char;
      }
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

/**
 * Calculate the Monaco range for the entire path up to and including the cursor segment
 * This will highlight the full path being referenced (e.g., "consts.indexName" when hovering on "indexName")
 * Properly handles bracket notation like "output[0].result"
 */
function calculatePathRangeUpToCursor(
  path: string,
  segmentIndex: number,
  contentStart: number,
  lineNumber: number
): monaco.Range | null {
  const segments = parsePathSegments(path);

  if (segmentIndex >= segments.length) {
    return null;
  }

  // Find the end position in the original path string for the target segment
  let currentSegment = 0;
  let pathEndOffset = 0;
  let inBracket = false;
  let quoteChar: string | null = null;
  let segmentStart = 0;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (inBracket) {
      if (quoteChar) {
        if (char === quoteChar) {
          quoteChar = null;
        }
      } else if (char === '"' || char === "'") {
        quoteChar = char;
      } else if (char === ']') {
        inBracket = false;
        if (currentSegment === segmentIndex) {
          // This is our target segment
          pathEndOffset = i + 1; // Include the ]
          break;
        }
        currentSegment++;
        segmentStart = i + 1;
      }
    } else {
      if (char === '[') {
        inBracket = true;
        // Only increment if there was content before the bracket
        if (i > segmentStart && path.slice(segmentStart, i).trim()) {
          if (currentSegment === segmentIndex) {
            // Target segment ends before bracket
            pathEndOffset = i;
            break;
          }
          currentSegment++;
        }
        segmentStart = i;
      } else if (char === '.') {
        if (i > segmentStart && path.slice(segmentStart, i).trim()) {
          if (currentSegment === segmentIndex) {
            // Target segment ends before dot
            pathEndOffset = i;
            break;
          }
          currentSegment++;
        }
        segmentStart = i + 1;
      }
    }
  }

  // If we didn't break, we're at the end of the path
  if (pathEndOffset === 0) {
    pathEndOffset = path.length;
  }

  // Calculate Monaco positions (1-based columns)
  const startColumn = contentStart + 1;
  const endColumn = contentStart + pathEndOffset + 1;

  return new monaco.Range(lineNumber, startColumn, lineNumber, endColumn);
}

/**
 * Find which segment the cursor is positioned on
 * e.g., for "steps.stepA.output" with cursor at position 12, returns 1 (stepA)
 * Also handles bracket notation: "output[0].result" with cursor at 10 returns 1 ([0])
 */
function findSegmentAtCursor(path: string, cursorPosition: number): number {
  const segments = parsePathSegments(path);

  // Build a map of character positions to segment indices
  let segmentIndex = 0;
  let inBracket = false;
  let quoteChar: string | null = null;
  let segmentStart = 0;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (i === cursorPosition) {
      return segmentIndex;
    }

    if (inBracket) {
      if (quoteChar) {
        if (char === quoteChar) {
          quoteChar = null;
        }
      } else if (char === '"' || char === "'") {
        quoteChar = char;
      } else if (char === ']') {
        inBracket = false;
        segmentIndex++;
        segmentStart = i + 1;
      }
    } else {
      if (char === '[') {
        inBracket = true;
        // Only increment if there was content before the bracket
        if (i > segmentStart && path.slice(segmentStart, i).trim()) {
          segmentIndex++;
        }
        segmentStart = i;
      } else if (char === '.') {
        if (i > segmentStart && path.slice(segmentStart, i).trim()) {
          segmentIndex++;
        }
        segmentStart = i + 1;
      }
    }
  }

  return Math.min(segmentIndex, segments.length - 1);
}
