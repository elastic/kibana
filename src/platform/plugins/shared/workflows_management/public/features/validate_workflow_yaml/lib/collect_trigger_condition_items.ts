/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Pair } from 'yaml';
import { isMap, isPair, isScalar, visit } from 'yaml';
import { getPathFromAncestors } from '../../../../common/lib/yaml';

export interface TriggerConditionItem {
  triggerIndex: number;
  triggerType: string;
  condition: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  yamlPath: (string | number)[];
}

/** Path is triggers[n].with.condition → returns n; otherwise null. */
function getTriggerIndexIfConditionPath(path: (string | number)[]): number | null {
  if (
    path.length < 4 ||
    path[0] !== 'triggers' ||
    typeof path[1] !== 'number' ||
    path[2] !== 'with' ||
    path[3] !== 'condition'
  ) {
    return null;
  }
  return path[1];
}

/** Read trigger type from the trigger map (ancestors[length-3]). */
function getTriggerTypeFromAncestors(ancestors: readonly unknown[]): string | null {
  const triggerMap = ancestors[ancestors.length - 3];
  if (!isMap(triggerMap) || !triggerMap.items) {
    return null;
  }
  const typePair = triggerMap.items.find(
    (item): item is Pair => isPair(item) && isScalar(item.key) && item.key.value === 'type'
  );
  return typePair && isScalar(typePair.value) ? (typePair.value.value as string) : null;
}

function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  const lines = text.substring(0, offset).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Collects all custom trigger condition nodes (triggers[].with.condition) from the YAML document
 * with their positions and trigger type. Used to validate that each condition is valid KQL
 * and only references properties from the trigger's eventSchema.
 */
export function collectTriggerConditionItems(yamlDocument: Document): TriggerConditionItem[] {
  const items: TriggerConditionItem[] = [];

  if (!yamlDocument?.contents || yamlDocument.errors.length > 0) {
    return items;
  }

  const text = yamlDocument.toString();

  visit(yamlDocument, {
    Pair(_key, pair, ancestors) {
      if (!isScalar(pair.key) || pair.key.value !== 'condition') {
        return;
      }
      // Ancestors are the path to the parent of this Pair, so they don't include this key.
      // Build full path by appending the current Pair's key.
      const parentPath = getPathFromAncestors(ancestors);
      const path = [...parentPath, pair.key.value as string];
      const triggerIndex = getTriggerIndexIfConditionPath(path);
      if (triggerIndex === null) {
        return;
      }
      const valueNode = pair.value;
      if (!valueNode || !isScalar(valueNode) || !valueNode.range) {
        return;
      }

      const triggerType = getTriggerTypeFromAncestors(ancestors);
      if (!triggerType) {
        return;
      }

      // yaml Range is [start, value-end, node-end]; use start and node-end for full span
      const [startOffset, , endOffset] = valueNode.range;
      const start = offsetToLineColumn(text, startOffset);
      const end = offsetToLineColumn(text, endOffset);

      items.push({
        triggerIndex,
        triggerType,
        condition: (valueNode.value as string) ?? '',
        startLineNumber: start.line,
        startColumn: start.column,
        endLineNumber: end.line,
        endColumn: end.column,
        yamlPath: path,
      });
    },
  });

  return items;
}
