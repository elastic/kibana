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
import { isEnterForeach } from '@kbn/workflows/graph';
import { VARIABLE_REGEX_GLOBAL } from '../../../../common/lib/regex';
import { getPathAtOffset, getStepNode } from '../../../../common/lib/yaml';
import { getMonacoRangeFromYamlNode } from '../../../widgets/workflow_yaml_editor/lib/utils';
import type { VariableItem } from '../model/types';

export function collectAllVariables(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  workflowGraph: WorkflowGraph
): VariableItem[] {
  const yamlString = model.getValue();
  const variableItems: VariableItem[] = [];
  // Currently, foreach doesn't use mustache expressions, so we need to handle it separately
  // TODO: remove if/when foreach uses mustache expressions
  for (const node of workflowGraph?.getAllNodes() ?? []) {
    if (!isEnterForeach(node)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const yamlNode = getStepNode(yamlDocument, node.stepId);
    const foreachValueNode = yamlNode?.get('foreach', true);
    if (foreachValueNode && foreachValueNode.range) {
      const monacoPosition = getMonacoRangeFromYamlNode(model, foreachValueNode);
      variableItems.push({
        id: `${node.configuration.foreach}-${monacoPosition?.startLineNumber ?? 0}-${
          monacoPosition?.startColumn ?? 0
        }-${monacoPosition?.endLineNumber ?? 0}-${monacoPosition?.endColumn ?? 0}`,
        startLineNumber: monacoPosition?.startLineNumber ?? 0,
        startColumn: monacoPosition?.startColumn ?? 0,
        endLineNumber: monacoPosition?.endLineNumber ?? 0,
        endColumn: monacoPosition?.endColumn ?? 0,
        key: node.configuration.foreach,
        type: 'foreach',
        yamlPath: getPathAtOffset(yamlDocument, foreachValueNode.range[0]),
      });
    }
  }
  for (const match of yamlString.matchAll(VARIABLE_REGEX_GLOBAL)) {
    const startOffset = match.index ?? 0;
    const endOffset = startOffset + (match[0].length ?? 0);
    const startPosition = model.getPositionAt(startOffset);
    const endPosition = model.getPositionAt(endOffset);
    variableItems.push({
      id: `${match.groups?.key ?? null}-${startPosition.lineNumber}-${startPosition.column}-${
        endPosition.lineNumber
      }-${endPosition.column}`,
      startLineNumber: startPosition.lineNumber,
      startColumn: startPosition.column,
      endLineNumber: endPosition.lineNumber,
      endColumn: endPosition.column,
      key: match.groups?.key ?? null,
      type: 'regexp',
      yamlPath: getPathAtOffset(yamlDocument, startOffset),
    });
  }

  return variableItems;
}
