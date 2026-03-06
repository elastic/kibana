/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Liquid } from 'liquidjs';
import { parseDocument, visit } from 'yaml';
import type { Scalar } from 'yaml';
import { createWorkflowLiquidEngine } from '@kbn/workflows';

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
  }
  return liquidInstance;
}

function convertOffsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  const lines = text.substring(0, offset).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

const LIQUID_PATTERN = /\{\{|\{%/;

/**
 * Attempts to pinpoint the specific error token within the YAML node's raw text,
 * falling back to the full node range if no specific token can be identified.
 */
function findErrorRange(
  rawSlice: string,
  nodeStart: number,
  nodeEnd: number,
  errorMessage: string
): { start: number; end: number } {
  const filterMatch = errorMessage.match(/undefined filter:\s*([a-zA-Z_]\w*)/);
  if (filterMatch) {
    const filterName = filterMatch[1];
    const filterRegex = new RegExp(`\\|\\s*${filterName}\\b`);
    const pipeMatch = filterRegex.exec(rawSlice);
    if (pipeMatch) {
      const idx = rawSlice.indexOf(filterName, pipeMatch.index);
      if (idx !== -1) {
        return { start: nodeStart + idx, end: nodeStart + idx + filterName.length };
      }
    }
  }

  const tagMatch = errorMessage.match(/tag ['"](.*?)['"] not found/);
  if (tagMatch) {
    const tagName = tagMatch[1];
    const idx = rawSlice.indexOf(tagName);
    if (idx !== -1) {
      return { start: nodeStart + idx, end: nodeStart + idx + tagName.length };
    }
  }

  return { start: nodeStart, end: nodeEnd };
}

/**
 * Validates Liquid template syntax in YAML string values.
 *
 * Parses the YAML document and validates each resolved string value individually,
 * rather than running the Liquid parser on the raw YAML text. This avoids false
 * positives from YAML formatting artifacts (e.g. line-folding escape continuations)
 * that the Liquid parser cannot understand.
 */
export function validateLiquidTemplate(yamlString: string): LiquidValidationError[] {
  let doc;
  try {
    doc = parseDocument(yamlString);
  } catch {
    // YAML syntax errors are caught by the dedicated YAML syntax validator.
    return [];
  }

  const liquid = getLiquidInstance();
  const errors: LiquidValidationError[] = [];

  visit(doc, {
    Scalar(_key, node: Scalar) {
      if (_key === 'key') return;
      if (typeof node.value !== 'string') return;

      const value = node.value;
      if (!LIQUID_PATTERN.test(value)) return;

      try {
        liquid.parse(value);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid Liquid syntax';
        const customerFacingErrorMessage = errorMessage.replace(/, line:\d+, col:\d+/g, '');

        const [rangeStart, valueEnd] = node.range ?? [0, 0, 0];
        const rawSlice = yamlString.substring(rangeStart, valueEnd);
        const { start, end } = findErrorRange(rawSlice, rangeStart, valueEnd, errorMessage);

        const startPos = convertOffsetToLineColumn(yamlString, start);
        const endPos = convertOffsetToLineColumn(yamlString, end);

        errors.push({
          message: customerFacingErrorMessage,
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
