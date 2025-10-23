/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import type { LineCounter } from 'yaml';
import YAML from 'yaml';
export interface StepInfo {
  stepId: string;
  stepType: string;
  stepYamlNode: any;
  lineStart: number;
  lineEnd: number;
}

/**
 * Lookup table containing parsed workflow elements from a YAML document.
 * This interface serves as an index for quickly accessing workflow components
 * by their identifiers, along with metadata about their location in the document.
 *
 * @interface WorkflowLookup
 */
export interface WorkflowLookup {
  /** Map of step IDs to their corresponding step information and metadata */
  steps: Record<string, StepInfo>;
}

/**
 * Parses a YAML document to build a lookup table of workflow elements.
 *
 * This function traverses the YAML document structure and extracts workflow steps,
 * creating an indexed collection for efficient access. Each step is mapped by its
 * identifier and includes metadata such as type, YAML node reference, and line
 * position information for editor integration.
 *
 * @param yamlDocument - The parsed YAML document containing workflow definition
 * @param model - Monaco editor text model for calculating line positions
 * @returns WorkflowLookup object containing indexed workflow elements
 *
 * @example
 * ```typescript
 * const yamlDoc = YAML.parseDocument(yamlContent);
 * const editorModel = monaco.editor.getModel(uri);
 * const lookup = buildWorkflowLookup(yamlDoc, editorModel);
 *
 * // Access a specific step
 * const stepInfo = lookup.steps['my-step-id'];
 * console.log(`Step type: ${stepInfo.stepType}, Lines: ${stepInfo.lineStart}-${stepInfo.lineEnd}`);
 * ```
 */
export function buildWorkflowLookup(
  yamlDocument: YAML.Document,
  lineCounter: LineCounter
): WorkflowLookup {
  const steps: Record<string, StepInfo> = {};

  if (!YAML.isMap(yamlDocument?.contents)) {
    return {
      steps: {},
    };
  }

  Object.assign(
    steps,
    inspectStep(yamlDocument?.contents, lineCounter) // stepItems can be null if there are no steps defined yet
  );

  return {
    steps,
  };
}

function inspectStep(node: any, lineCounter: LineCounter): Record<string, StepInfo> {
  const result: Record<string, StepInfo> = {};

  let stepId: string | undefined;
  let stepType: string | undefined;

  if (YAML.isMap(node)) {
    node.items.forEach((item) => {
      if (YAML.isPair(item)) {
        if (YAML.isScalar(item.key)) {
          if (YAML.isScalar(item.value)) {
            if (item.key.value === 'name') {
              stepId = item.value.value as string;
            } else if (item.key.value === 'type') {
              stepType = item.value.value as string;
            }
          }
        }
        Object.assign(result, inspectStep(item.value, lineCounter));
      }
    });
  } else if (YAML.isSeq(node)) {
    node.items.forEach((subItem) => {
      Object.assign(result, inspectStep(subItem, lineCounter));
    });
  }

  if (stepId && stepType) {
    const lineStart = lineCounter.linePos(node.range![0]).line;
    const lineEnd = lineCounter.linePos(node.range![2] - 1).line;
    result[stepId] = {
      stepId,
      stepType,
      stepYamlNode: node,
      lineStart,
      lineEnd,
    };
  }

  return result;
}
