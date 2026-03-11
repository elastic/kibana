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

/**
 * Detect if we're in a scheduled trigger's with block
 */
export function isInScheduledTriggerWithBlock(
  yamlDocument: Document,
  absolutePosition: number
): boolean {
  let result = false;

  visit(yamlDocument, {
    Map(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      if (node.get('type') !== 'scheduled') {
        return;
      }

      // Find the 'with' property node within this trigger
      const withPair = node.items.find(
        (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
      ) as Pair<Scalar, Node> | undefined;

      if (withPair) {
        let isInWithBlock = false;

        // Check if cursor is within the value's range (for non-empty values)
        if (withPair.value?.range) {
          if (
            absolutePosition >= withPair.value.range[0] &&
            absolutePosition <= withPair.value.range[2]
          ) {
            isInWithBlock = true;
          }
        }

        // For empty or null values, check if cursor is in the area where a value would be typed
        // This includes immediately after the colon and on the next line(s) with proper indentation
        if (!isInWithBlock && withPair.key?.range) {
          const keyEnd = withPair.key.range[2];

          // Get the boundary position - look for next content after the trigger
          let boundaryPosition: number | undefined;

          // First check if there's a next property in the same trigger
          const triggerItemIndex = node.items.indexOf(withPair);
          if (triggerItemIndex < node.items.length - 1) {
            const nextItem = node.items[triggerItemIndex + 1];
            if (isPair(nextItem) && isScalar(nextItem.key) && nextItem.key?.range) {
              boundaryPosition = nextItem.key.range[0];
            }
          }

          // If no boundary found yet, look at the parent context
          if (!boundaryPosition && ancestors.length > 1) {
            // Get the trigger's parent (triggers array) and grandparent (document)
            const document = ancestors[ancestors.length - 2];

            if (isMap(document) && document.items) {
              // Find what comes after 'triggers' in the document
              const triggersIndex = document.items.findIndex(
                (item) => isPair(item) && isScalar(item.key) && item.key.value === 'triggers'
              );

              if (triggersIndex !== -1 && triggersIndex < document.items.length - 1) {
                const nextDocItem = document.items[triggersIndex + 1];
                if (isPair(nextDocItem) && isScalar(nextDocItem.key) && nextDocItem.key?.range) {
                  boundaryPosition = nextDocItem.key.range[0];
                }
              }
            }
          }

          // If still no boundary, use a reasonable distance (e.g., 50 characters)
          if (!boundaryPosition) {
            boundaryPosition = keyEnd + 50;
          }

          // Check if cursor is after the key but before the boundary
          if (absolutePosition > keyEnd && absolutePosition < boundaryPosition) {
            isInWithBlock = true;
          }
        }

        if (isInWithBlock) {
          // Check if there's already an existing rrule or every configuration
          if (withPair.value && hasExistingScheduleConfiguration(withPair.value)) {
            // Don't show rrule suggestions if there's already a schedule configuration
            result = false;
            return visit.BREAK;
          }

          result = true;
          return visit.BREAK;
        }
      }
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
