/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { DynamicStepContextSchema } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { VariableItem, YamlValidationResult } from '../types';
import { validateVariable } from './validate_variable';
import { getContextSchemaWithTemplateLocals } from '../context/extend_context_with_template_locals';
import { extendWithPathSpecificContext } from '../context/get_context_for_path';
import { getNearestStepPath } from '../context/get_nearest_step_path';
import {
  createStepContextResolver,
  type StepContextResolver,
} from '../context/step_context_resolver';
import { getValueAtYamlPath } from '../context/get_value_at_yaml_path';

export interface VariableValidationOptions {
  /** Shared across validators of one document so each step context is built once. */
  stepContextResolver?: StepContextResolver;
}

export function validateVariables(
  variableItems: VariableItem[],
  workflowGraph: WorkflowGraph,
  workflowDefinition: WorkflowYaml,
  yamlDocument?: Document | null,
  yamlString?: string,
  options?: VariableValidationOptions
): YamlValidationResult[] {
  const errors: YamlValidationResult[] = [];

  const stepContext =
    options?.stepContextResolver ??
    createStepContextResolver(workflowDefinition, workflowGraph, yamlDocument);

  const pathContextCache = new Map<string, typeof DynamicStepContextSchema>();
  const fullContextCache = new Map<string, typeof DynamicStepContextSchema>();

  for (const variableItem of variableItems) {
    const { yamlPath: path, offset } = variableItem;

    const nearestStepPath = getNearestStepPath(path);
    const nearestStep = nearestStepPath
      ? getValueAtYamlPath<{ name?: string }>(workflowDefinition, nearestStepPath)
      : undefined;

    let context: typeof DynamicStepContextSchema | null = null;

    try {
      const stepSchema = stepContext.forStep(nearestStep?.name);

      const pathSuffix = nearestStepPath ? path.slice(nearestStepPath.length) : [];
      // NUL-separated so step names cannot collide with path suffixes.
      const pathContextKey = `${nearestStep?.name ?? ''}\0${pathSuffix.join('\0')}`;

      let pathSchema = pathContextCache.get(pathContextKey);
      if (!pathSchema) {
        pathSchema = nearestStepPath
          ? extendWithPathSpecificContext(stepSchema, nearestStep, pathSuffix)
          : stepSchema;
        pathContextCache.set(pathContextKey, pathSchema);
      }

      context = pathSchema;
      if (yamlDocument != null && offset !== undefined) {
        const fullContextKey = `${pathContextKey}:${offset}`;
        const cachedContext = fullContextCache.get(fullContextKey);
        if (cachedContext) {
          context = cachedContext;
        } else {
          context = getContextSchemaWithTemplateLocals(
            yamlDocument,
            offset,
            pathSchema,
            yamlString
          );
          fullContextCache.set(fullContextKey, context);
        }
      }
    } catch {
      // Unreachable on any known input: the "step not in graph" throws are guarded by
      // the early return in getContextSchemaForStep, and every InvalidForeachParameterError
      // is already degraded to z.unknown() by getForeachStateSchema. Kept so that a throw
      // introduced here later costs one variable rather than the whole document, which the
      // document-level boundary in useYamlValidation would otherwise clear.
      context = null;
    }

    if (context !== null) {
      const error = validateVariable(variableItem, context, options);
      if (error) {
        errors.push(error);
      }
    }
  }

  return errors;
}
