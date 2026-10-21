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
import { STEP_CHILD_CONTAINER_KEYS } from '@kbn/workflows';

export interface StepInfo {
  stepId: string;
  stepType: string;
  stepYamlNode: YAML.YAMLMap<unknown, unknown>;
  /** Path of the step in the document, e.g. `['steps', 1, 'steps', 0]`. */
  path: Array<string | number>;
  lineStart: number;
  lineEnd: number;
  propInfos: Record<string, StepPropInfo>;
  parentStepId?: string;
  /**
   * Which nested key under the parent this step belongs to.
   * For simple slots: `'steps'`, `'else'`, `'on-failure'`, `'fallback'`.
   * For indexed slots: `'cases[0].steps'`, `'branches[1].steps'`.
   */
  branchKey?: string;
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
  /** Line where the last item in the triggers block ends; undefined when there are no triggers. */
  triggersLineEnd?: number;
  /** Line where the first step under `steps` starts; undefined when there are none. */
  stepsLineStart?: number;
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
    Object.assign(steps, inspectStep(stepsNode, lineCounter, undefined, undefined, ['steps']));
  }
  const stepLineStarts = Object.values(steps).map((s) => s.lineStart);
  const stepsLineStart = stepLineStarts.length > 0 ? Math.min(...stepLineStarts) : undefined;

  const settingsFallbackPath = ['settings', 'on-failure', 'fallback'];
  const settingsFallbackNode = yamlDocument.getIn(settingsFallbackPath, true);
  if (settingsFallbackNode) {
    Object.assign(
      steps,
      inspectStep(
        settingsFallbackNode,
        lineCounter,
        undefined,
        'on-failure.fallback',
        settingsFallbackPath
      )
    );
  }

  let triggersLineStart: number | undefined;
  let triggersLineEnd: number | undefined;
  const triggersNode = (yamlDocument.contents as any).get('triggers');
  if (triggersNode?.range) {
    triggersLineStart = lineCounter.linePos(triggersNode.range[0]).line;
    triggersLineEnd = lineCounter.linePos(triggersNode.range[2] - 1).line;
  }

  return {
    steps,
    triggersLineStart,
    triggersLineEnd,
    stepsLineStart,
  };
}

/**
 * Keys that identify a step *body* rather than a step *property*.
 * Used to exclude these from `propInfos` so downstream validators (e.g.
 * `validate_parallel_mode`, `validate_parallel_fan_out`) can use
 * `propInfos` to inspect step-level config keys like `foreach`, `branches`,
 * `cases` without confusing them with step body containers.
 *
 * `branches`, `cases`, and `default` are intentionally **not** in this list —
 * they must appear in `propInfos` so the parallel-mode validators can detect
 * whether a parallel step uses static branches or dynamic fan-out. Widening
 * this set to include those keys would silently break those validators.
 */
export const STEP_BODY_KEYS = [
  'steps',
  'else',
  'on-failure',
  'iteration-on-failure',
  'fallback',
] as const;

export type StepBodyKey = (typeof STEP_BODY_KEYS)[number];

/**
 * @deprecated Use `STEP_BODY_KEYS` instead.
 * Kept for backward compatibility with existing consumers.
 */
export const NESTED_STEP_KEYS = STEP_BODY_KEYS;

/**
 * @deprecated Use the type guard against `STEP_BODY_KEYS` directly.
 */
export type NestedStepKey = StepBodyKey;

export function isNestedStepKey(value: unknown): value is StepBodyKey {
  return typeof value === 'string' && (STEP_BODY_KEYS as readonly string[]).includes(value);
}

/**
 * Keys under which branch *identity* is recorded in `StepInfo.branchKey`.
 * Superset of `STEP_BODY_KEYS` — adds `branches`, `cases`, and `default` so
 * switch-case and parallel-branch steps get distinct `branchKey` values
 * (e.g. `'cases[0].steps'`) rather than inheriting the parent's key.
 * Built from the canonical constant so future slot additions stay in sync.
 */
const STEP_CHILD_CONTAINER_KEY_SET: ReadonlySet<string> = new Set(STEP_CHILD_CONTAINER_KEYS);

export function inspectStep(
  node: any,
  lineCounter: LineCounter,
  parentStepId?: string,
  branchKey?: string,
  // Shared across the recursion: each level pushes its segment and pops it on
  // return, so a copy is made only for each step found.
  path: Array<string | number> = []
): Record<string, StepInfo> {
  const result: Record<string, StepInfo> = {};

  let stepId: string | undefined;
  let stepType: string | undefined;

  if (YAML.isMap(node)) {
    // Pass 1: read the step's own name and type. Values under other keys
    // (e.g. `with`, `retry`) are data, not steps, so they are not walked.
    node.items.forEach((item) => {
      if (YAML.isPair(item) && YAML.isScalar(item.key) && YAML.isScalar(item.value)) {
        if (item.key.value === 'name') {
          stepId = item.value.value as string;
        } else if (item.key.value === 'type') {
          stepType = item.value.value as string;
        }
      }
    });

    node.items.forEach((item) => {
      if (YAML.isPair(item) && YAML.isScalar(item.key)) {
        const nestedKeyValue = item.key.value;
        if (typeof nestedKeyValue !== 'string') return;
        if (!STEP_CHILD_CONTAINER_KEY_SET.has(nestedKeyValue)) return;

        const childParentStepId = stepId ?? parentStepId;

        // Pass 2 (branch identity): generate indexed branchKey paths for
        // sequences of branch/case maps so each step gets a distinct branchKey.
        if (
          (nestedKeyValue === 'branches' || nestedKeyValue === 'cases') &&
          YAML.isSeq(item.value)
        ) {
          item.value.items.forEach((seqItem: any, idx: number) => {
            // The inner steps of each branch/case are under the `steps` key.
            if (YAML.isMap(seqItem)) {
              const innerSteps = seqItem.get('steps', true);
              if (innerSteps) {
                path.push(nestedKeyValue, idx, 'steps');
                Object.assign(
                  result,
                  inspectStep(
                    innerSteps,
                    lineCounter,
                    childParentStepId,
                    `${nestedKeyValue}[${idx}].steps`,
                    path
                  )
                );
                path.splice(-3);
              }
            }
          });
        } else {
          // Compose the branchKey so that on-failure.fallback and
          // iteration-on-failure.fallback get distinct identities. Without this,
          // both fallback sequences on a loop step collapse to branchKey='fallback'
          // (the intermediate on-failure / iteration-on-failure container keys are
          // overwritten by the nested 'fallback' recursion), merging them into a
          // single nesting_info rail.
          const childBranchKey =
            nestedKeyValue === 'fallback' &&
            (branchKey === 'on-failure' || branchKey === 'iteration-on-failure')
              ? `${branchKey}.fallback`
              : nestedKeyValue;
          path.push(nestedKeyValue);
          Object.assign(
            result,
            inspectStep(item.value, lineCounter, childParentStepId, childBranchKey, path)
          );
          path.pop();
        }
      }
    });
  } else if (YAML.isSeq(node)) {
    node.items.forEach((subItem, idx) => {
      path.push(idx);
      Object.assign(result, inspectStep(subItem, lineCounter, parentStepId, branchKey, path));
      path.pop();
    });
  }

  if (stepId && stepType && YAML.isMap(node)) {
    const propNodes: Record<string, StepPropInfo> = {};
    node.items.forEach((innerNode) => {
      if (YAML.isPair(innerNode) && YAML.isScalar(innerNode.key)) {
        // propInfos excludes only STEP_BODY_KEYS — branches/cases/default are
        // intentionally kept so parallel-mode validators can detect the step shape.
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
      path: [...path],
      parentStepId,
      branchKey,
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
