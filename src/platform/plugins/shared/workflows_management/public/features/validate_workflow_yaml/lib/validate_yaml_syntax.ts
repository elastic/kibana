/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, LineCounter } from 'yaml';
import { getYamlDocumentErrorsDetailed } from '../../../../common/lib/yaml';
import type { YamlValidationResult } from '../model/types';

/**
 * Validates the YAML document for syntax issues such as flow mappings/sequences
 * used as keys or values (e.g. `comment: {{ inputs.comment }}`).
 */
export function validateYamlSyntax(
  yamlDocument: Document,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const errors = getYamlDocumentErrorsDetailed(yamlDocument);

  return errors.map((error) => {
    let startLineNumber = 1;
    let startColumn = 1;
    let endLineNumber = 1;
    let endColumn = 1;

    if (error.range) {
      const [startOffset, endOffset] = error.range;
      const startPos = lineCounter.linePos(startOffset);
      const endPos = lineCounter.linePos(endOffset);
      startLineNumber = startPos.line;
      startColumn = startPos.col;
      endLineNumber = endPos.line;
      endColumn = endPos.col;
    }

    return {
      id: `yaml-syntax-${startLineNumber}-${startColumn}-${endLineNumber}-${endColumn}`,
      owner: 'yaml-syntax-validation' as const,
      message: error.message,
      severity: 'error' as const,
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
      hoverMessage: error.message,
    };
  });
}
