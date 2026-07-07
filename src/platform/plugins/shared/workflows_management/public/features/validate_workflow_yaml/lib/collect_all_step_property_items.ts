/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import { isBuiltInStepProperty, isBuiltInStepType, type SelectionContext } from '@kbn/workflows';
import type { WorkflowLookup } from '../../../entities/workflows/store';
import {
  buildStepSelectionValues,
  getValueFromValueNode,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { GetStepPropertyHandler } from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/step_property/get_step_property_suggestions';
import type { StepPropertyItem } from '../model/types';

export function collectAllStepPropertyItems(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter,
  getPropertyHandler: GetStepPropertyHandler
): StepPropertyItem[] {
  const stepPropertyItems: StepPropertyItem[] = [];

  const steps = Object.values(workflowLookup.steps);
  for (const step of steps) {
    // Skip built-in step types (flow control steps: if, foreach, while, wait, etc.)
    if (!isBuiltInStepType(step.stepType)) {
      for (const [propKey, prop] of Object.entries(step.propInfos)) {
        if (
          prop.keyNode.range &&
          typeof prop.keyNode.value === 'string' &&
          // skip built-in step properties like name, type, with, etc.
          !isBuiltInStepProperty(prop.keyNode.value) &&
          prop.valueNode.range
        ) {
          const scope = prop.path.length > 0 && prop.path[0] === 'with' ? 'input' : 'config';
          const key = scope === 'config' ? propKey : propKey.split('.').slice(1).join('.');
          const propertyHandler = getPropertyHandler(step.stepType, scope, key);
          if (propertyHandler && propertyHandler.selection) {
            const selection = propertyHandler.selection;
            const [startOffset, endOffset] = prop.valueNode.range;
            const startPos = lineCounter.linePos(startOffset);
            const endPos = lineCounter.linePos(endOffset);
            const contextValues = buildStepSelectionValues(step, selection.dependsOnValues);
            const context: SelectionContext = {
              stepType: step.stepType,
              scope,
              propertyKey: key,
              values: contextValues,
            };
            stepPropertyItems.push({
              id: `${step.stepId}-${key}-${startPos.line}-${startPos.col}-${endPos.line}-${endPos.col}`,
              stepId: step.stepId,
              startLineNumber: startPos.line,
              startColumn: startPos.col,
              endLineNumber: endPos.line,
              endColumn: endPos.col,
              type: 'step-property',
              scope,
              stepType: step.stepType,
              propertyKey: key,
              propertyValue: getValueFromValueNode(prop.valueNode),
              selectionHandler: propertyHandler.selection,
              context,
              yamlPath: prop.path,
              key: prop.keyNode.value,
            });
          }
        }
      }
    }
  }
  return stepPropertyItems;
}
