/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Liquid } from 'liquidjs';
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

export function validateLiquidTemplate(yamlString: string): LiquidValidationError[] {
  try {
    const liquid = getLiquidInstance();
    liquid.parse(yamlString);
    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid Liquid syntax';
    const position = extractLiquidErrorPosition(yamlString, errorMessage);
    const customerFacingErrorMessage = errorMessage.replace(/, line:\d+, col:\d+/g, '');

    const startPos = convertOffsetToLineColumn(yamlString, position.start);
    const endPos = convertOffsetToLineColumn(yamlString, position.end);

    return [
      {
        message: customerFacingErrorMessage,
        startLine: startPos.line,
        startColumn: startPos.column,
        endLine: endPos.line,
        endColumn: endPos.column,
      },
    ];
  }
}
