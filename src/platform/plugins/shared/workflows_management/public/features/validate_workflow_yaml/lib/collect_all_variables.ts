/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Output, type PropertyAccessToken, TokenKind } from 'liquidjs';
import type { Document, Scalar as YamlScalar } from 'yaml';
import { visit } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { createWorkflowLiquidEngine } from '@kbn/workflows/common/utils';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { getPathFromAncestors } from '../../../../common/lib/yaml';
import type { VariableItem } from '../model/types';

const liquidEngine = createWorkflowLiquidEngine();

interface ScalarVariable {
  key: string;
  startOffset: number;
  endOffset: number;
  yamlPath: Array<string | number>;
}

function getValueStartOffset(node: YamlScalar): number | null {
  if (!node.range) return null;
  const rangeStart = node.range[0];
  if (node.type === 'QUOTE_DOUBLE' || node.type === 'QUOTE_SINGLE') {
    return rangeStart + 1;
  }
  return rangeStart;
}

function extractVariablesFromScalar(
  node: YamlScalar,
  yamlPath: Array<string | number>
): ScalarVariable[] {
  const value = node.value;
  if (typeof value !== 'string' || value === '') return [];

  const valueStartOffset = getValueStartOffset(node);
  if (valueStartOffset === null) return [];

  const results: ScalarVariable[] = [];

  try {
    const tokens = liquidEngine.parse(value);
    for (const token of tokens) {
      if (!(token instanceof Output)) {
        // skip HTML nodes and other non-output tokens
      } else {
        const first = token.value?.initial?.postfix?.[0];
        if (first && first.kind === TokenKind.PropertyAccess) {
          const propertyAccess = first as PropertyAccessToken;
          results.push({
            key: propertyAccess.getText(),
            startOffset: valueStartOffset + token.token.begin,
            endOffset: valueStartOffset + token.token.end,
            yamlPath,
          });
        }
      }
    }
  } catch {
    // LiquidJS couldn't parse this scalar — skip it
  }

  return results;
}

export function collectAllVariables(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  workflowGraph: WorkflowGraph
): VariableItem[] {
  const variables: ScalarVariable[] = [];

  visit(yamlDocument, {
    Scalar(_k, node, ancestors) {
      if (!node.range || node.value === '') return;
      const yamlPath = getPathFromAncestors(ancestors, node);
      variables.push(...extractVariablesFromScalar(node, yamlPath));
    },
  });

  return variables.map((v) => {
    const startPosition = model.getPositionAt(v.startOffset);
    const endPosition = model.getPositionAt(v.endOffset);
    const type =
      v.yamlPath.length > 1 && v.yamlPath[v.yamlPath.length - 1] === 'foreach'
        ? 'foreach'
        : 'regexp';

    return {
      id: `${v.key}-${startPosition.lineNumber}-${startPosition.column}-${endPosition.lineNumber}-${endPosition.column}`,
      startLineNumber: startPosition.lineNumber,
      startColumn: startPosition.column,
      endLineNumber: endPosition.lineNumber,
      endColumn: endPosition.column,
      key: v.key,
      type,
      yamlPath: v.yamlPath,
      offset: v.startOffset,
    };
  });
}
