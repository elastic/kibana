/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isPair, isScalar, isSeq } from 'yaml';
import type { Document, YAMLSeq } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { WorkflowOutput } from '@kbn/workflows';
import type { AutocompleteContext } from '../../context/autocomplete.types';

/**
 * Maximum distance (in characters) between cursor and last step
 * to consider the cursor as being within that step's context
 */
const MAX_STEP_DISTANCE = 100;

function createOutputSuggestion(
  output: WorkflowOutput,
  range: monaco.IRange
): monaco.languages.CompletionItem {
  const outputValuePlaceholder = output.type === 'string' ? '"${1:value}"' : '${1:value}';

  return {
    label: output.name,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText: `${output.name}: ${outputValuePlaceholder}`,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    documentation: output.description || `${output.type} output`,
    detail: `${output.type}${output.required ? ' (required)' : ' (optional)'}`,
    preselect: output.required,
  };
}

/**
 * Finds which step contains the given cursor position by checking ranges
 * Returns the step index if found
 * If position is between steps, returns the closest step before the position
 */
function findStepIndexAtPosition(yamlDocument: Document, absolutePosition: number): number | null {
  const stepsNode = yamlDocument.get('steps', true);

  if (!stepsNode || !isSeq(stepsNode)) {
    return null;
  }

  const stepsSeq = stepsNode as YAMLSeq;
  let closestStepIndex: number | null = null;
  let closestDistance = Infinity;

  // Iterate through steps and check if the position falls within any step's range
  for (let i = 0; i < stepsSeq.items.length; i++) {
    const stepNode = stepsSeq.items[i];
    if (stepNode && typeof stepNode === 'object' && 'range' in stepNode) {
      const range = (stepNode as { range?: [number, number, number] }).range;
      if (range) {
        const positionInRange = absolutePosition >= range[0] && absolutePosition <= range[2];

        // Exact match - position is within the step's range
        if (positionInRange) {
          return i;
        }

        // Track the closest step before the cursor position
        // If cursor is after this step's end, calculate distance
        if (absolutePosition > range[2]) {
          const distance = absolutePosition - range[2];
          if (distance < closestDistance) {
            closestDistance = distance;
            closestStepIndex = i;
          }
        }
      }
    }
  }

  // If no exact match, use the closest step if it's within a reasonable distance
  // This handles the case where we're typing on a new line that hasn't been parsed yet
  if (closestStepIndex !== null && closestDistance < MAX_STEP_DISTANCE) {
    return closestStepIndex;
  }

  return null;
}

/**
 * Gets the step type from a step index
 */
function getStepTypeFromIndex(yamlDocument: Document, stepIndex: number): string | null {
  const stepNode = yamlDocument.getIn(['steps', stepIndex], true);
  if (!isMap(stepNode) || !stepNode.items) {
    return null;
  }

  const typePair = stepNode.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
  );

  if (typePair && isPair(typePair) && isScalar(typePair.value)) {
    return String(typePair.value.value);
  }

  return null;
}

/**
 * Checks if a step has a 'with' property
 */
function stepHasWithProperty(yamlDocument: Document, stepIndex: number): boolean {
  const stepNode = yamlDocument.getIn(['steps', stepIndex], true);
  if (!isMap(stepNode) || !stepNode.items) {
    return false;
  }

  return stepNode.items.some(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );
}

/**
 * Checks if the cursor is in the 'with:' block of a workflow.output step
 * This needs to work reliably across all lines within the with block,
 * including when Monaco's YAML parser returns an incomplete path like ['steps']
 */
export function isInWorkflowOutputWithBlock(
  path: (string | number)[],
  focusedStepInfo: { stepType?: string; propInfos?: Record<string, unknown> } | null,
  yamlDocument?: Document,
  absolutePosition?: number
): boolean {
  // Path must start with steps
  if (path[0] !== 'steps') {
    return false;
  }

  let stepIndex: number | null = null;
  let stepType: string | null = null;

  // Try to get step index from path (most reliable when available)
  if (typeof path[1] === 'number') {
    stepIndex = path[1];
  }
  // Fallback: if path is just ['steps'], use position-based detection
  else if (path.length === 1 && yamlDocument && typeof absolutePosition === 'number') {
    stepIndex = findStepIndexAtPosition(yamlDocument, absolutePosition);
  }

  // If we still don't have a step index, we can't determine context
  if (stepIndex === null) {
    return false;
  }

  // Try to get step type from focusedStepInfo first (fast path)
  stepType = focusedStepInfo?.stepType || null;

  // If focusedStepInfo doesn't have the type or is stale, get it from YAML
  if (!stepType && yamlDocument) {
    stepType = getStepTypeFromIndex(yamlDocument, stepIndex);
  }

  // Must be in a workflow.output step
  if (stepType !== 'workflow.output') {
    return false;
  }

  // Primary check: if 'with' is in the path, we're definitely in the with block
  const withIndex = path.findIndex((segment) => segment === 'with');
  if (withIndex !== -1) {
    return true;
  }

  // Secondary check: if we're at the step level but the step has a 'with' property,
  // we're likely typing inside the with block (Monaco hasn't updated path yet)
  if (focusedStepInfo?.propInfos?.with) {
    return true;
  }

  // Final fallback: check YAML document directly for with property
  if (yamlDocument && stepHasWithProperty(yamlDocument, stepIndex)) {
    return true;
  }

  return false;
}

/**
 * Gets workflow outputs suggestions for autocomplete
 * Used when typing in the with: section of a workflow.output step
 *
 * NOTE: When suggestions are returned, Monaco YAML provider suggestions are suppressed
 * to ensure only declared output fields are suggested (see get_completion_item_provider.ts)
 */
export async function getWorkflowOutputsSuggestions(
  autocompleteContext: AutocompleteContext
): Promise<monaco.languages.CompletionItem[]> {
  const { focusedStepInfo, path, range, workflowDefinition, yamlDocument, absoluteOffset } =
    autocompleteContext;

  // Check if we're in a workflow.output step's with: block
  if (!isInWorkflowOutputWithBlock(path, focusedStepInfo, yamlDocument, absoluteOffset)) {
    return [];
  }

  const declaredOutputs = workflowDefinition?.outputs;
  if (!declaredOutputs || declaredOutputs.length === 0) {
    return [];
  }

  // Get already provided output keys to avoid suggesting them again
  const withProp = focusedStepInfo?.propInfos?.with;
  const existingKeys = new Set<string>();
  if (withProp?.valueNode && isMap(withProp.valueNode)) {
    withProp.valueNode.items.forEach((item) => {
      if (isPair(item) && isScalar(item.key) && typeof item.key.value === 'string') {
        existingKeys.add(item.key.value);
      }
    });
  }

  const suggestions: monaco.languages.CompletionItem[] = [];

  for (const output of declaredOutputs) {
    if (!existingKeys.has(output.name)) {
      suggestions.push(createOutputSuggestion(output, range));
    }
  }

  return suggestions;
}
