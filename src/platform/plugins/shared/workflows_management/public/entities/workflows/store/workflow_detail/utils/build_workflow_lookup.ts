/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RecursivePartial } from '@kbn/utility-types';
import { isBuiltInStepProperty, type StepSelectionValues } from '@kbn/workflows';
import { getValueFromValueNode, type StepInfo } from '@kbn/workflows-yaml';
import { isRecord } from '../../../../../../common/lib/type_guards';

export {
  buildWorkflowLookup,
  inspectStep,
  getValueFromValueNode,
  type StepInfo,
  type StepPropInfo,
  type WorkflowLookup,
} from '@kbn/workflows-yaml';

// Path segments come from YAML keys; use null-prototype objects so keys like "__proto__"
// cannot resolve inherited accessors or pollute Object.prototype when nesting.
function setNested(obj: Record<string, unknown>, segments: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (!isRecord(current[seg])) {
      current[seg] = Object.create(null) as Record<string, unknown>;
    }
    current = current[seg] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}

/**
 * Whether a leaf dotted path (e.g. `config.proxy.ssl`) should be included for the given
 * `valuePaths` (from `dependsOnValues`). Matches exact paths, ancestors, or descendants.
 */
function leafPathMatchesValuePaths(dottedLeafKey: string, valuePaths: readonly string[]): boolean {
  return valuePaths.some(
    (vp) =>
      dottedLeafKey === vp ||
      dottedLeafKey.startsWith(`${vp}.`) ||
      vp.startsWith(`${dottedLeafKey}.`)
  );
}

/**
 * Builds structured config/input values from a step's scalar leaf properties.
 * Properties under the `with` block are placed in `input`; all others in `config`.
 *
 * When `valuePaths` is provided (e.g. from `selection.dependsOnValues`), only properties
 * whose dotted `config.*` / `input.*` path matches are included — single pass over `propInfos`.
 */
export function buildStepSelectionValues(
  step: StepInfo,
  valuePaths?: readonly string[]
): StepSelectionValues {
  // Same null-prototype initialization as setNested (see comment there) — required to avoid prototype pollution.
  const config = Object.create(null) as RecursivePartial<Record<string, unknown>>;
  const input = Object.create(null) as RecursivePartial<Record<string, unknown>>;

  const pathsToMatch = valuePaths && valuePaths.length > 0 ? valuePaths : undefined;
  if (!pathsToMatch) {
    return { config, input };
  }

  for (const propInfo of Object.values(step.propInfos)) {
    const rootKey = propInfo.path[0];
    if (rootKey === 'with') {
      const inputPath = propInfo.path.slice(1);
      if (inputPath.length > 0) {
        const dottedKey = `input.${inputPath.join('.')}`;
        if (leafPathMatchesValuePaths(dottedKey, pathsToMatch)) {
          setNested(input, inputPath, getValueFromValueNode(propInfo.valueNode));
        }
      }
    } else if (typeof rootKey !== 'string' || !isBuiltInStepProperty(rootKey)) {
      const dottedKey = `config.${propInfo.path.join('.')}`;
      if (leafPathMatchesValuePaths(dottedKey, pathsToMatch)) {
        setNested(config, propInfo.path, getValueFromValueNode(propInfo.valueNode));
      }
    }
  }

  return { config, input };
}
