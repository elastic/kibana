/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Liquid } from 'liquidjs';
import { type Document, Scalar, visit } from 'yaml';
import { createWorkflowLiquidEngine } from '@kbn/workflows';
import { extractLiquidErrorPosition } from './extract_liquid_error_position';

export interface LiquidValidationError {
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

let liquidInstance: Liquid | null = null;

function getLiquidInstance(): Liquid {
  if (!liquidInstance) {
    liquidInstance = createWorkflowLiquidEngine({
      strictFilters: true,
      strictVariables: false,
    });
    liquidInstance.registerFilter('json_parse', (value: unknown): unknown => {
      return value;
    });
    liquidInstance.registerFilter('entries', (value: unknown): unknown => {
      return value;
    });
  }
  return liquidInstance;
}

function convertOffsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: offset - lastNewline };
}

/**
 * Maps an error position (relative to `node.value`) back to an absolute
 * offset range within the full YAML source string.
 *
 * For PLAIN and quoted scalars the mapping is a simple offset shift.
 * For block scalars (| / >) the indentation stripping makes a linear
 * offset shift incorrect, so we fall back to searching for the error
 * token directly in the node's source span.
 */
function mapToAbsolutePosition(
  yamlString: string,
  node: Scalar,
  errorMessage: string,
  relativePosition: { start: number; end: number }
): { start: number; end: number } {
  const range = node.range;
  if (!range) return relativePosition;

  switch (node.type) {
    case Scalar.BLOCK_FOLDED:
    case Scalar.BLOCK_LITERAL: {
      const nodeSource = yamlString.substring(range[0], range[2]);
      const posInSource = extractLiquidErrorPosition(nodeSource, errorMessage);
      return {
        start: range[0] + posInSource.start,
        end: range[0] + posInSource.end,
      };
    }
    case Scalar.QUOTE_DOUBLE:
    case Scalar.QUOTE_SINGLE: {
      const valueStart = range[0] + 1;
      return {
        start: valueStart + relativePosition.start,
        end: valueStart + relativePosition.end,
      };
    }
    default: {
      return {
        start: range[0] + relativePosition.start,
        end: range[0] + relativePosition.end,
      };
    }
  }
}

const LIQUID_OUTPUT_PATTERN = '{{';
const LIQUID_TAG_PATTERN = '{%';

export function validateLiquidTemplate(
  yamlString: string,
  yamlDocument: Document
): LiquidValidationError[] {
  const errors: LiquidValidationError[] = [];
  const liquid = getLiquidInstance();

  visit(yamlDocument, {
    Scalar(key, node) {
      if (key === 'key') return;
      if (!node.range) return;
      if (typeof node.value !== 'string') return;
      if (!node.value.includes(LIQUID_OUTPUT_PATTERN) && !node.value.includes(LIQUID_TAG_PATTERN))
        return;

      try {
        liquid.parse(node.value);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid Liquid syntax';
        const relativePosition = extractLiquidErrorPosition(node.value, errorMessage);
        const absPosition = mapToAbsolutePosition(yamlString, node, errorMessage, relativePosition);

        const startPos = convertOffsetToLineColumn(yamlString, absPosition.start);
        const endPos = convertOffsetToLineColumn(yamlString, absPosition.end);

        errors.push({
          message: errorMessage.replace(/, line:\d+, col:\d+/g, ''),
          startLine: startPos.line,
          startColumn: startPos.column,
          endLine: endPos.line,
          endColumn: endPos.column,
        });
      }
    },
  });

  return errors;
}
