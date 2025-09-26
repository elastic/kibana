/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import YAML from 'yaml';
export interface StepInfo {
  stepId: string;
  stepType: string;
  lineStart: number;
  lineEnd: number;
}

export interface WorkflowMetadata {
  steps: Record<string, StepInfo>;
}

export function indexYamlDocument(
  yamlDocument: YAML.Document,
  model: monaco.editor.ITextModel
): WorkflowMetadata {
  const steps: Record<string, StepInfo> = {};

  if (!YAML.isMap(yamlDocument?.contents)) {
    return {
      steps: {},
    };
  }

  Object.assign(
    steps,
    inspectStep(yamlDocument?.contents, model) // stepItems can be null if there are no steps defined yet
  );

  return {
    steps,
  };
}

function inspectStep(node: any, model: monaco.editor.ITextModel): Record<string, StepInfo> {
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
        Object.assign(result, inspectStep(item.value, model));
      }
    });
  } else if (YAML.isSeq(node)) {
    node.items.forEach((subItem) => {
      Object.assign(result, inspectStep(subItem, model));
    });
  }

  if (stepId && stepType) {
    const lineStart = model.getPositionAt(node.range![0]).lineNumber;
    const lineEnd = model.getPositionAt(node.range![2]).lineNumber - 1;
    result[stepId] = {
      stepId,
      stepType,
      lineStart,
      lineEnd,
    };
  }

  return result;
}
