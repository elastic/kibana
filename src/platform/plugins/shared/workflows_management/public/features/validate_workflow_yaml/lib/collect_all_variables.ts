/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { VARIABLE_REGEX_GLOBAL } from '../../../../common/lib/regex';
import { getPathAtOffset } from '../../../../common/lib/yaml';
import type { VariableItem } from '../model/types';

export function collectAllVariables(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  workflowGraph: WorkflowGraph
): VariableItem[] {
  const yamlString = model.getValue();
  const variableItems: VariableItem[] = [];
  for (const match of yamlString.matchAll(VARIABLE_REGEX_GLOBAL)) {
    const startOffset = match.index ?? 0;
    const endOffset = startOffset + (match[0].length ?? 0);
    const startPosition = model.getPositionAt(startOffset);
    const endPosition = model.getPositionAt(endOffset);
    const yamlPath = getPathAtOffset(yamlDocument, startOffset);
    // simple heuristic to determine if it's a foreach configuration variable
    const type =
      yamlPath.length > 1 && yamlPath[yamlPath.length - 1] === 'foreach' ? 'foreach' : 'regexp';
    variableItems.push({
      id: `${match.groups?.key ?? null}-${startPosition.lineNumber}-${startPosition.column}-${
        endPosition.lineNumber
      }-${endPosition.column}`,
      startLineNumber: startPosition.lineNumber,
      startColumn: startPosition.column,
      endLineNumber: endPosition.lineNumber,
      endColumn: endPosition.column,
      key: match.groups?.key ?? null,
      type,
      yamlPath,
    });
  }

  return variableItems;
}
