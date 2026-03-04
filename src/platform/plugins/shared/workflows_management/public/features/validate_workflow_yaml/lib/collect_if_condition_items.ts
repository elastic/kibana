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

export interface IfConditionItem {
  condition: string;
  conditionKind: 'if-step' | 'step-level-if';
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  yamlPath: (string | number)[];
}

function getStepTypeFromMap(mapNode: unknown): string | null {
  if (!isMap(mapNode) || !mapNode.items) {
    return null;
  }
  const typePair = mapNode.items.find(
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
 * Checks whether a path represents a step-level condition that should be validated as KQL.
 * Returns the kind of condition or null if the path is not a condition.
 *
 * Matches:
 *  - `steps[n].condition` where the step has `type: if` → 'if-step'
 *  - `steps[n].if` on any step → 'step-level-if'
 *
 * These can appear at any nesting depth (inside foreach, if/else, on-failure, etc.)
 * so we only check that the key is `condition` or `if` and that the immediate parent is a step map.
 */
function getConditionKind(key: string, parentMap: unknown): 'if-step' | 'step-level-if' | null {
  if (key === 'condition') {
    const stepType = getStepTypeFromMap(parentMap);
    if (stepType === 'if') {
      return 'if-step';
    }
    return null;
  }

  if (key === 'if') {
    return 'step-level-if';
  }

  return null;
}

/**
 * Collects all if-step condition nodes (`steps[n].condition` where type is 'if')
 * and step-level `if` conditions (`steps[n].if` on any step) from the YAML document
 * with their positions. Used to validate that each condition is valid KQL syntax.
 */
export function collectIfConditionItems(yamlDocument: Document): IfConditionItem[] {
  const items: IfConditionItem[] = [];

  if (!yamlDocument?.contents || yamlDocument.errors.length > 0) {
    return items;
  }

  const text = yamlDocument.toString();

  visit(yamlDocument, {
    Pair(_key, pair, ancestors) {
      if (!isScalar(pair.key)) {
        return;
      }

      const keyValue = pair.key.value as string;
      if (keyValue !== 'condition' && keyValue !== 'if') {
        return;
      }

      const valueNode = pair.value;
      if (!valueNode || !isScalar(valueNode) || !valueNode.range) {
        return;
      }

      const conditionValue = valueNode.value;
      if (typeof conditionValue !== 'string' || conditionValue.trim() === '') {
        return;
      }

      const parentPath = getPathFromAncestors(ancestors);
      const path = [...parentPath, keyValue];

      // The parent map is the step map containing this key.
      // In the YAML visitor, ancestors include [Document, rootMap, ...].
      // The last ancestor before the Pair is the map that contains this Pair.
      const parentMap = ancestors[ancestors.length - 1];
      const conditionKind = getConditionKind(keyValue, parentMap);
      if (!conditionKind) {
        return;
      }

      const [startOffset, , endOffset] = valueNode.range;
      const start = offsetToLineColumn(text, startOffset);
      const end = offsetToLineColumn(text, endOffset);

      items.push({
        condition: conditionValue,
        conditionKind,
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
