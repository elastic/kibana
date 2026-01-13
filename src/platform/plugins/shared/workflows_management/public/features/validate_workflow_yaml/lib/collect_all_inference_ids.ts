/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document, isPair, isScalar, type LineCounter, visit } from 'yaml';
import { getPathFromAncestors } from '../../../../common/lib/yaml';
import type { InferenceIdItem } from '../model/types';

export function collectAllInferenceIds(
  yamlDocument: Document,
  lineCounter: LineCounter | undefined
): InferenceIdItem[] {
  const inferenceIdItems: InferenceIdItem[] = [];

  if (!yamlDocument?.contents || !lineCounter) {
    return inferenceIdItems;
  }

  visit(yamlDocument, {
    Scalar(key, node, ancestors) {
      if (!node.range) {
        return;
      }

      const lastAncestor = ancestors?.[ancestors.length - 1];
      const isInferenceIdProp =
        isPair(lastAncestor) &&
        isScalar(lastAncestor.key) &&
        lastAncestor.key.value === 'inference_id';

      if (!isInferenceIdProp || !node.value) {
        return;
      }

      // Make sure we're looking at the VALUE of an inference_id property, not the key itself
      const isInferenceIdValue = isPair(lastAncestor) && lastAncestor.value === node;

      if (!isInferenceIdValue) {
        return;
      }

      // Walk up the ancestors to find the step node to verify it's a rerank step
      let isRerankStep = false;
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (ancestor && typeof ancestor === 'object' && 'items' in ancestor) {
          const items = (ancestor as any).items; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (Array.isArray(items)) {
            for (const item of items) {
              if (isPair(item) && isScalar(item.key) && item.key.value === 'type' && isScalar(item.value)) {
                if (item.value.value === 'workflows.rerank') {
                  isRerankStep = true;
                  break;
                }
              }
            }
            if (isRerankStep) {
              break;
            }
          }
        }
      }

      // Only collect inference_id from rerank steps
      if (!isRerankStep) {
        return;
      }

      // Get the path to determine the yamlPath
      const path = getPathFromAncestors(ancestors);

      const [startOffset, endOffset] = node.range;

      // Use LineCounter to convert byte offsets to line/column positions
      const startPos = lineCounter.linePos(startOffset);
      const endPos = lineCounter.linePos(endOffset);

      inferenceIdItems.push({
        id: `${node.value}-${startPos.line}-${startPos.col}-${endPos.line}-${endPos.col}`,
        type: 'inference-id',
        key: node.value as string,
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
        yamlPath: path,
      });
    },
  });

  return inferenceIdItems;
}
