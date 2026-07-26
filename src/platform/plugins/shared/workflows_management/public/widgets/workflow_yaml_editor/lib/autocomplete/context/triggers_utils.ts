/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Node, Pair, Scalar } from 'yaml';
import { isMap, isPair, isScalar, visit } from 'yaml';
import type { StepInfo } from '../../../../../entities/workflows/store';

/**
 * When the YAML path is `triggers[i].on.condition` (cursor in the condition value),
 * returns `i`. Otherwise `null`.
 */
export function getTriggerConditionBlockIndex(path: (string | number)[]): number | null {
  if (
    path.length < 4 ||
    path[0] !== 'triggers' ||
    typeof path[1] !== 'number' ||
    path[2] !== 'on' ||
    path[3] !== 'condition'
  ) {
    return null;
  }
  return path[1];
}

/**
 * Reads `triggers[triggerIndex].type` from the parsed YAML document.
 */
export function getTriggerTypeAtIndex(yamlDocument: Document, triggerIndex: number): string | null {
  // `keepScalar: true` returns the YAML Scalar node; without it, leaf paths resolve to plain JS values
  // and `isScalar` is false (e.g. string primitive for `type: example.custom_trigger`).
  const typeNode = yamlDocument.getIn(['triggers', triggerIndex, 'type'], true);
  if (isScalar(typeNode) && typeNode.value !== null && typeNode.value !== undefined) {
    return String(typeNode.value);
  }
  return null;
}

/**
 * Detect if the current cursor position is inside a triggers block
 */
export function isInTriggersContext(path: (string | number)[]): boolean {
  // Check if the path includes 'triggers' at any level
  // Examples: ['triggers'], ['triggers', 0], ['triggers', 0, 'with'], etc.
  return path.length > 0 && path[0] === 'triggers';
}

export function isInStepsContext(path: (string | number)[]): boolean {
  return path.length > 0 && path[0] === 'steps';
}

/**
 * Detect if the cursor is inside a `with.inputs` block in the YAML path.
 * Used to structurally identify workflow input key-value pairs instead of
 * relying on text-based deny-lists in the line parser.
 */
export function isInWorkflowInputsPath(path: (string | number)[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i] === 'with' && path[i + 1] === 'inputs') {
      return true;
    }
  }
  return false;
}

/**
 * Position-based fallback for detecting `with.inputs` context.
 * Used when `getPathAtOffset` returns an empty path (e.g. cursor is on a blank
 * line right after `inputs:` with no value). Checks whether the focused step
 * has a `with.inputs` prop and the cursor is positioned after that key but
 * before the next sibling property (to avoid false positives on `await:` etc.).
 */
export function isInWorkflowInputsByPosition(
  focusedStepInfo: StepInfo | null,
  absoluteOffset: number
): boolean {
  if (!focusedStepInfo) return false;
  const inputsProp = focusedStepInfo.propInfos['with.inputs'];
  if (!inputsProp?.keyNode?.range) return false;

  const inputsKeyEnd = inputsProp.keyNode.range[2];
  if (absoluteOffset <= inputsKeyEnd) return false;

  const upperBound = getInputsUpperBound(focusedStepInfo);
  return upperBound === undefined || absoluteOffset < upperBound;
}

/**
 * Finds the upper bound offset for the `inputs` region inside a step's `with` map.
 * Returns the start of the next sibling key after `inputs`, or the end of the
 * `with` map value, or undefined if no bound can be determined.
 */
function getInputsUpperBound(focusedStepInfo: StepInfo): number | undefined {
  const stepNode = focusedStepInfo.stepYamlNode;
  if (!isMap(stepNode)) return undefined;

  const withPair = stepNode.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );
  if (!withPair || !isPair(withPair) || !isMap(withPair.value)) return undefined;

  const withMap = withPair.value;
  const inputsIndex = withMap.items.findIndex(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'inputs'
  );
  if (inputsIndex === -1) return undefined;

  // Use the next sibling key in `with` as the bound
  if (inputsIndex < withMap.items.length - 1) {
    const nextItem = withMap.items[inputsIndex + 1];
    if (isPair(nextItem) && isScalar(nextItem.key) && nextItem.key?.range) {
      return nextItem.key.range[0];
    }
  }

  // No next sibling in `with` — use the end of the `with` map value
  if (withMap.range) {
    return withMap.range[2];
  }

  return undefined;
}

function getBoundaryAfterScheduledWithPair(
  withPair: Pair,
  triggerItems: readonly Pair[],
  ancestors: readonly unknown[]
): number | undefined {
  const triggerItemIndex = triggerItems.indexOf(withPair);
  if (triggerItemIndex !== -1 && triggerItemIndex < triggerItems.length - 1) {
    const nextItem = triggerItems[triggerItemIndex + 1];
    if (isPair(nextItem) && isScalar(nextItem.key) && nextItem.key.range) {
      return nextItem.key.range[0];
    }
  }

  if (ancestors.length <= 1) {
    return undefined;
  }

  const document = ancestors[ancestors.length - 2];
  if (!isMap(document) || !document.items) {
    return undefined;
  }

  const triggersIndex = document.items.findIndex(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'triggers'
  );
  if (triggersIndex === -1 || triggersIndex >= document.items.length - 1) {
    return undefined;
  }

  const nextDocItem = document.items[triggersIndex + 1];
  if (isPair(nextDocItem) && isScalar(nextDocItem.key) && nextDocItem.key?.range) {
    return nextDocItem.key.range[0];
  }

  return undefined;
}

function cursorInScheduledTriggerWithRegion(
  absolutePosition: number,
  withPair: Pair<Scalar, Node>,
  triggerItems: readonly Pair[],
  ancestors: readonly unknown[]
): boolean {
  const valueRange = withPair.value?.range;
  if (valueRange && absolutePosition >= valueRange[0] && absolutePosition <= valueRange[2]) {
    return true;
  }

  const keyRange = withPair.key?.range;
  if (!keyRange) {
    return false;
  }
  const keyEnd = keyRange[2];
  const boundary =
    getBoundaryAfterScheduledWithPair(withPair, triggerItems, ancestors) ?? keyEnd + 50;

  return absolutePosition > keyEnd && absolutePosition < boundary;
}

/**
 * Detect if we're in a scheduled trigger's with block
 */
export function isInScheduledTriggerWithBlock(
  yamlDocument: Document,
  absolutePosition: number
): boolean {
  let result = false;

  visit(yamlDocument, {
    Map(_key, node, ancestors) {
      if (!node.range || node.get('type') !== 'scheduled') {
        return;
      }

      const withPair = node.items.find(
        (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
      ) as Pair<Scalar, Node> | undefined;

      if (!withPair) {
        return;
      }

      if (!cursorInScheduledTriggerWithRegion(absolutePosition, withPair, node.items, ancestors)) {
        return;
      }

      if (withPair.value && hasExistingScheduleConfiguration(withPair.value)) {
        result = false;
        return visit.BREAK;
      }

      result = true;
      return visit.BREAK;
    },
  });

  return result;
}

/**
 * Check if there's already an existing schedule configuration (rrule or every) in the with block
 */
function hasExistingScheduleConfiguration(withNode: Node): boolean {
  if (!withNode || !isMap(withNode)) {
    return false;
  }

  // Check for existing 'rrule' or 'every' properties
  const items = withNode.items || [];

  for (const item of items) {
    if (isPair(item) && isScalar(item.key)) {
      const keyValue = item.key.value;
      if (keyValue === 'rrule' || keyValue === 'every') {
        return true;
      }
    }
  }

  return false;
}
