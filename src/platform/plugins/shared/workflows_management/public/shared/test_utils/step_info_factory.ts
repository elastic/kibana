/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import type {
  StepInfo,
  WorkflowLookup,
} from '../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

/**
 * A lazily-initialized real `YAMLMap` node used as the default `stepYamlNode`
 * in test factories. Avoids `{} as any` casts while keeping setup cost minimal
 * (parsed once and shared across all tests in the module).
 */
let _defaultStepYamlNode: YAML.YAMLMap<unknown, unknown> | undefined;

const getDefaultStepYamlNode = (): YAML.YAMLMap<unknown, unknown> => {
  if (!_defaultStepYamlNode) {
    const doc = YAML.parseDocument('name: test_step\ntype: console');
    if (!YAML.isMap(doc.contents)) {
      throw new Error('Test setup: expected a YAMLMap from default step yaml');
    }
    _defaultStepYamlNode = doc.contents;
  }
  return _defaultStepYamlNode;
};

/**
 * Create a `StepInfo` with a real `stepYamlNode` (a parsed `YAMLMap`).
 * Eliminates the need for `{} as any` or `{} as YAML.YAMLMap` casts in tests.
 *
 * @example
 * ```ts
 * const step = createStepInfo({ stepId: 'search', stepType: 'elasticsearch.search' });
 * const lookup = createWorkflowLookup([step]);
 * ```
 */
export const createStepInfo = (overrides: Partial<StepInfo> = {}): StepInfo => ({
  stepId: 'step-1',
  stepType: 'action',
  stepYamlNode: getDefaultStepYamlNode(),
  lineStart: 1,
  lineEnd: 10,
  propInfos: {},
  ...overrides,
});

/**
 * Build a `WorkflowLookup` from an array of `StepInfo` objects.
 *
 * @example
 * ```ts
 * const lookup = createWorkflowLookup([
 *   createStepInfo({ stepId: 'step1', lineStart: 5, lineEnd: 10 }),
 *   createStepInfo({ stepId: 'step2', lineStart: 12, lineEnd: 18 }),
 * ]);
 * ```
 */
export const createWorkflowLookup = (steps: StepInfo[]): WorkflowLookup => ({
  steps: steps.reduce<Record<string, StepInfo>>((acc, step) => {
    acc[step.stepId] = step;
    return acc;
  }, {}),
});
