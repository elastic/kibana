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
import type { ConnectorIdItem } from '../model/types';

export function collectAllConnectorIds(
  yamlDocument: Document,
  lineCounter: LineCounter | undefined
): ConnectorIdItem[] {
  const connectorIdItems: ConnectorIdItem[] = [];

  if (!yamlDocument?.contents || !lineCounter) {
    return connectorIdItems;
  }

  visit(yamlDocument, {
    Scalar(key, node, ancestors) {
      if (!node.range) {
        return;
      }

      const lastAncestor = ancestors?.[ancestors.length - 1];
      const isConnectorIdProp =
        isPair(lastAncestor) &&
        isScalar(lastAncestor.key) &&
        lastAncestor.key.value === 'connector-id';

      if (!isConnectorIdProp || !node.value) {
        return;
      }

      // Make sure we're looking at the VALUE of a connector-id property, not the key itself
      const isConnectorIdValue = isPair(lastAncestor) && lastAncestor.value === node;

      if (!isConnectorIdValue) {
        return;
      }

      let connectorType = 'unknown';

      // Walk up the ancestors to find the step node (should contain both 'type' and 'connector-id')
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (ancestor && typeof ancestor === 'object' && 'items' in ancestor) {
          // Check if this node has both 'type' and 'connector-id' properties
          const items = (ancestor as any).items; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (Array.isArray(items)) {
            let hasType = false;
            let hasConnectorId = false;
            let typeValue = null;

            for (const item of items) {
              if (isPair(item) && isScalar(item.key)) {
                if (item.key.value === 'type' && isScalar(item.value)) {
                  hasType = true;
                  typeValue = item.value.value;
                } else if (item.key.value === 'connector-id') {
                  hasConnectorId = true;
                }
              }
            }

            if (hasType && hasConnectorId && typeValue) {
              connectorType = typeValue as string;
              break;
            }
          }
        }
      }

      // Get the path to determine the yamlPath
      const path = getPathFromAncestors(ancestors);

      const [startOffset, endOffset] = node.range;

      // Use LineCounter to convert byte offsets to line/column positions
      const startPos = lineCounter.linePos(startOffset);
      const endPos = lineCounter.linePos(endOffset);

      connectorIdItems.push({
        id: `${node.value}-${startPos.line}-${startPos.col}-${endPos.line}-${endPos.col}`,
        connectorType,
        type: 'connector-id',
        key: node.value as string,
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
        yamlPath: path,
      });
    },
  });

  return connectorIdItems;
}
