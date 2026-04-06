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
import type { YamlValidationResult } from '../model/types';

// Lazy initialization - only create when needed
let liquidInstance: Liquid | null = null;

function getLiquidInstance(): Liquid {
  if (!liquidInstance) {
    liquidInstance = createWorkflowLiquidEngine({
      strictFilters: true,
      strictVariables: false, // Allow undefined variables during validation
    });
    // register filters, for validation purposes only
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

export function validateLiquidTemplate(yamlString: string): YamlValidationResult[] {
  try {
    // Parse the template to check for syntax errors
    const liquid = getLiquidInstance();
    liquid.parse(yamlString);
    // no errors
    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid Liquid syntax';
    // Extract error position, by default liquid returns the start of the line of the error message
    const position = extractLiquidErrorPosition(yamlString, errorMessage);
    // customer-facing error message without the default line number and column number
    const customerFacingErrorMessage = errorMessage.replace(/, line:\d+, col:\d+/g, '');

    const startPos = convertOffsetToLineColumn(yamlString, position.start);
    const endPos = convertOffsetToLineColumn(yamlString, position.end);

    return [
      {
        id: `liquid-template-${startPos.line}-${startPos.column}-${endPos.line}-${endPos.column}`,
        owner: 'liquid-template-validation',
        message: customerFacingErrorMessage,
        startLineNumber: startPos.line,
        startColumn: startPos.column,
        endLineNumber: endPos.line,
        endColumn: endPos.column,
        severity: 'error',
        hoverMessage: customerFacingErrorMessage,
      },
    ];
  }
}
