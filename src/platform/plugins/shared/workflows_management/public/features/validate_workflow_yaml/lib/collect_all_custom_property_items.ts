/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import {
  isBuiltInStepProperty,
  isBuiltInStepType,
  type SelectionContext,
  type StepPropertyHandler,
} from '@kbn/workflows';
import type { WorkflowLookup } from '../../../entities/workflows/store';
import type { CustomPropertyItem } from '../model/types';

export function collectAllCustomPropertyItems(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter,
  getPropertyHandler: (
    stepType: string,
    scope: 'config' | 'input',
    key: string
  ) => StepPropertyHandler | null
): CustomPropertyItem[] {
  const customPropertyItems: CustomPropertyItem[] = [];

  const steps = Object.values(workflowLookup.steps);
  for (const step of steps) {
    // Only collect custom properties for non-built-in step types
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
            const [startOffset, endOffset] = prop.valueNode.range;
            const startPos = lineCounter.linePos(startOffset);
            const endPos = lineCounter.linePos(endOffset);
            const context: SelectionContext = {
              stepType: step.stepType,
              scope,
              propertyKey: key,
            };
            customPropertyItems.push({
              id: `${step.stepId}-${key}-${startPos.line}-${startPos.col}-${endPos.line}-${endPos.col}`,
              startLineNumber: startPos.line,
              startColumn: startPos.col,
              endLineNumber: endPos.line,
              endColumn: endPos.col,
              type: 'custom-property',
              scope,
              stepType: step.stepType,
              propertyKey: key,
              propertyValue: prop.valueNode.value,
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
  return customPropertyItems;
}
