/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import YAML from 'yaml';

export interface StepInfo {
  stepId: string;
  stepType: string;
  stepYamlNode: YAML.YAMLMap<unknown, unknown>;
  lineStart: number;
  lineEnd: number;
  propInfos: Record<string, StepPropInfo>;
  parentStepId?: string;
}

export interface StepPropInfo {
  path: string[];
  keyNode: YAML.Scalar<unknown>;
  valueNode: YAML.Scalar<unknown>;
}

export function getValueFromValueNode(
  valueNode: YAML.Scalar<unknown> | YAML.YAMLSeq<unknown>
): unknown {
  if (!valueNode) {
    return undefined;
  }
  if (YAML.isScalar(valueNode)) {
    return valueNode.value;
  }
  if ('toJSON' in valueNode && typeof valueNode.toJSON === 'function') {
    return valueNode.toJSON();
  }
  return (valueNode as { value?: unknown }).value;
}

export interface WorkflowLookup {
  steps: Record<string, StepInfo>;
  triggersLineStart?: number;
}

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

  const stepsNode = (yamlDocument.contents as any).get('steps');
  if (stepsNode) {
    Object.assign(steps, inspectStep(stepsNode, lineCounter));
  }

  let triggersLineStart: number | undefined;
  const triggersNode = (yamlDocument.contents as any).get('triggers');
  if (triggersNode?.range) {
    triggersLineStart = lineCounter.linePos(triggersNode.range[0]).line;
  }

  return {
    steps,
    triggersLineStart,
  };
}

export const NESTED_STEP_KEYS = [
  'steps',
  'else',
  'on-failure',
  'iteration-on-failure',
  'fallback',
] as const;

export type NestedStepKey = (typeof NESTED_STEP_KEYS)[number];

export function isNestedStepKey(value: unknown): value is NestedStepKey {
  return typeof value === 'string' && (NESTED_STEP_KEYS as readonly string[]).includes(value);
}

export function inspectStep(
  node: any,
  lineCounter: LineCounter,
  parentStepId?: string
): Record<string, StepInfo> {
  const result: Record<string, StepInfo> = {};

  let stepId: string | undefined;
  let stepType: string | undefined;

  if (YAML.isMap(node)) {
    node.items.forEach((item) => {
      if (YAML.isPair(item)) {
        if (YAML.isScalar(item.key) && YAML.isScalar(item.value)) {
          if (item.key.value === 'name') {
            stepId = item.value.value as string;
          } else if (item.key.value === 'type') {
            stepType = item.value.value as string;
          }
        }

        const keyValue = YAML.isScalar(item.key) ? item.key.value : undefined;
        if (!isNestedStepKey(keyValue)) {
          const currentParentStepId = stepId ?? parentStepId;
          Object.assign(result, inspectStep(item.value, lineCounter, currentParentStepId));
        }
      }
    });

    node.items.forEach((item) => {
      if (YAML.isPair(item) && YAML.isScalar(item.key)) {
        if (isNestedStepKey(item.key.value)) {
          Object.assign(result, inspectStep(item.value, lineCounter, stepId ?? parentStepId));
        }
      }
    });
  } else if (YAML.isSeq(node)) {
    node.items.forEach((subItem) => {
      Object.assign(result, inspectStep(subItem, lineCounter, parentStepId));
    });
  }

  if (stepId && stepType && YAML.isMap(node)) {
    const propNodes: Record<string, StepPropInfo> = {};
    node.items.forEach((innerNode) => {
      if (YAML.isPair(innerNode) && YAML.isScalar(innerNode.key)) {
        if (!isNestedStepKey(innerNode.key.value)) {
          Object.assign(propNodes, visitStepProps(innerNode));
        }
      }
    });
    const lineStart = lineCounter.linePos(node.range![0]).line;
    const lineEnd = lineCounter.linePos(node.range![2] - 1).line;
    result[stepId] = {
      stepId,
      stepType,
      stepYamlNode: node,
      lineStart,
      lineEnd,
      propInfos: propNodes,
      parentStepId,
    };
  }

  return result;
}

function visitStepProps(node: any, stack: string[] = []): Record<string, StepPropInfo> {
  const result: Record<string, StepPropInfo> = {};
  if (YAML.isMap(node.value)) {
    stack.push(node.key.value);
    node.value.items.forEach((childNode: any) => {
      Object.assign(result, visitStepProps(childNode, stack));
    });
    stack.pop();
  } else {
    const path = [...stack, node.key.value];
    const composedKey = path.join('.');
    result[composedKey] = {
      path,
      keyNode: node.key,
      valueNode: node.value,
    };
  }

  return result;
}
