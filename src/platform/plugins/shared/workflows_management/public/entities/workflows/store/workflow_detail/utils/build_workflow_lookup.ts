/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBuiltInStepProperty, type StepSelectionValues } from '@kbn/workflows';
import { isRecord } from '../../../../../../common/lib/type_guards';
import {
  getValueFromValueNode,
  type StepInfo,
} from '../../../../../../common/lib/yaml/build_workflow_lookup';

export {
  buildWorkflowLookup,
  inspectStep,
  getValueFromValueNode,
  type StepInfo,
  type StepPropInfo,
  type WorkflowLookup,
} from '../../../../../../common/lib/yaml/build_workflow_lookup';

function setNested(obj: Record<string, unknown>, segments: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (!isRecord(current[seg])) {
      current[seg] = {};
    }
    current = current[seg] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}

/**
 * Builds structured config/input values from a step's scalar leaf properties.
 * Properties under the `with` block are placed in `input`; all others in `config`.
 */
export function buildStepSelectionValues(step: StepInfo): StepSelectionValues {
  const config: Record<string, unknown> = {};
  const input: Record<string, unknown> = {};

  for (const propInfo of Object.values(step.propInfos)) {
    const rootKey = propInfo.path[0];
    if (rootKey === 'with') {
      const inputPath = propInfo.path.slice(1);
      if (inputPath.length > 0) {
        setNested(input, inputPath, getValueFromValueNode(propInfo.valueNode));
      }
    } else if (typeof rootKey !== 'string' || !isBuiltInStepProperty(rootKey)) {
      setNested(config, propInfo.path, getValueFromValueNode(propInfo.valueNode));
    }
  }

  return { config, input };
}
