/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type { LineCounter } from 'yaml';
import { i18n } from '@kbn/i18n';
import { resolveRef } from '@kbn/workflows/spec/lib/input_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { convertJsonSchemaToZod } from '../../../../common/lib/json_schema_to_zod';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import type {
  StepInfo,
  WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../model/types';

const WORKFLOW_EXECUTE_STEP_TYPES = ['workflow.execute', 'workflow.executeAsync'];
const WITH_INPUTS_PREFIX = 'with.inputs.';

function isLiquidTemplate(value: unknown): boolean {
  return typeof value === 'string' && value.includes('${{');
}

function addUnknownKeyError(
  results: YamlValidationResult[],
  step: StepInfo,
  topLevelInputName: string,
  childWorkflow: { name: string },
  schemaPropertyNames: Set<string>,
  propInfo: StepInfo['propInfos'][string],
  lineCounter: LineCounter
): void {
  const keyRange = propInfo.keyNode?.range;
  if (!keyRange) return;
  const startPos = lineCounter.linePos(keyRange[0]);
  const endPos = lineCounter.linePos(keyRange[1]);
  results.push({
    id: `workflow-inputs-unknown-${step.stepId}-${topLevelInputName}`,
    severity: 'warning',
    message: i18n.translate('workflows.validateWorkflowInputs.unknownInputKey', {
      defaultMessage:
        'Unknown input "{inputName}" for workflow "{workflowName}". Available inputs: {availableInputs}',
      values: {
        inputName: topLevelInputName,
        workflowName: childWorkflow.name,
        availableInputs:
          schemaPropertyNames.size > 0 ? [...schemaPropertyNames].join(', ') : '(none defined)',
      },
    }),
    owner: 'workflow-inputs-validation',
    startLineNumber: startPos.line,
    startColumn: startPos.col,
    endLineNumber: endPos.line,
    endColumn: endPos.col,
    hoverMessage: null,
  });
}

function addTypeError(
  results: YamlValidationResult[],
  step: StepInfo,
  topLevelInputName: string,
  childWorkflow: { name: string },
  propInfo: StepInfo['propInfos'][string],
  lineCounter: LineCounter,
  errorMessages: string
): void {
  const valueRange = propInfo.valueNode?.range ?? propInfo.keyNode?.range;
  if (!valueRange) return;
  const startPos = lineCounter.linePos(valueRange[0]);
  const endPos = lineCounter.linePos(valueRange[1]);
  results.push({
    id: `workflow-inputs-type-${step.stepId}-${topLevelInputName}`,
    severity: 'error',
    message: i18n.translate('workflows.validateWorkflowInputs.invalidInputType', {
      defaultMessage:
        'Input "{inputName}" has invalid value for workflow "{workflowName}": {errorMessage}',
      values: {
        inputName: topLevelInputName,
        workflowName: childWorkflow.name,
        errorMessage: errorMessages,
      },
    }),
    owner: 'workflow-inputs-validation',
    startLineNumber: startPos.line,
    startColumn: startPos.col,
    endLineNumber: endPos.line,
    endColumn: endPos.col,
    hoverMessage: null,
  });
}

function validateInputValueType(
  rawValue: unknown,
  propSchema: JSONSchema7,
  schema: JsonModelSchemaType
): string | null {
  const resolvedSchema = propSchema.$ref ? resolveRef(propSchema.$ref, schema) : propSchema;
  if (!resolvedSchema) return null;
  try {
    const zodSchema = convertJsonSchemaToZod(resolvedSchema);
    const parseResult = zodSchema.safeParse(rawValue);
    if (!parseResult.success) {
      return parseResult.error.issues.map((issue) => issue.message).join('; ');
    }
  } catch {
    return null;
  }
  return null;
}

function validateStepInputs(
  step: StepInfo,
  childWorkflow: { id: string; name: string },
  schema: JsonModelSchemaType,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];
  const schemaPropertyNames = new Set(Object.keys(schema.properties ?? {}));
  const requiredNames = new Set(schema.required ?? []);
  const providedInputNames = new Set<string>();
  const workflowIdProp = step.propInfos['with.workflow-id'];
  if (!workflowIdProp) return results;

  const inputsScalarProp = step.propInfos['with.inputs'];
  if (inputsScalarProp && isLiquidTemplate(inputsScalarProp.valueNode?.value)) {
    return results;
  }

  const inputEntries = Object.entries(step.propInfos).filter(([key]) =>
    key.startsWith(WITH_INPUTS_PREFIX)
  );

  for (const [propKey, propInfo] of inputEntries) {
    const inputPath = propKey.slice(WITH_INPUTS_PREFIX.length);
    const topLevelInputName = inputPath.split('.')[0];
    providedInputNames.add(topLevelInputName);

    if (inputPath !== topLevelInputName) {
      // Nested property, skip type check here
    } else if (!schemaPropertyNames.has(topLevelInputName)) {
      addUnknownKeyError(
        results,
        step,
        topLevelInputName,
        childWorkflow,
        schemaPropertyNames,
        propInfo,
        lineCounter
      );
    } else {
      const rawValue = propInfo.valueNode?.value;
      if (!isLiquidTemplate(rawValue) && schema.properties) {
        const propSchemaRaw = schema.properties[topLevelInputName];
        if (propSchemaRaw && typeof propSchemaRaw === 'object') {
          const errorMessages = validateInputValueType(
            rawValue,
            propSchemaRaw as JSONSchema7,
            schema
          );
          if (errorMessages) {
            addTypeError(
              results,
              step,
              topLevelInputName,
              childWorkflow,
              propInfo,
              lineCounter,
              errorMessages
            );
          }
        }
      }
    }
  }

  for (const requiredName of requiredNames) {
    if (!providedInputNames.has(requiredName)) {
      const anchorRange = workflowIdProp.valueNode?.range ?? workflowIdProp.keyNode?.range;
      if (anchorRange) {
        const startPos = lineCounter.linePos(anchorRange[0]);
        const endPos = lineCounter.linePos(anchorRange[1]);
        results.push({
          id: `workflow-inputs-missing-${step.stepId}-${requiredName}`,
          severity: 'error',
          message: i18n.translate('workflows.validateWorkflowInputs.missingRequiredInput', {
            defaultMessage: 'Required input "{inputName}" is missing for workflow "{workflowName}"',
            values: {
              inputName: requiredName,
              workflowName: childWorkflow.name,
            },
          }),
          owner: 'workflow-inputs-validation',
          startLineNumber: startPos.line,
          startColumn: startPos.col,
          endLineNumber: endPos.line,
          endColumn: endPos.col,
          hoverMessage: null,
        });
      }
    }
  }

  return results;
}

function getStepValidationContext(
  step: StepInfo,
  workflows: WorkflowsResponse['workflows']
): {
  step: StepInfo;
  childWorkflow: { id: string; name: string };
  schema: JsonModelSchemaType;
} | null {
  const workflowIdProp = step.propInfos['with.workflow-id'];
  if (!workflowIdProp) return null;
  const workflowId = workflowIdProp.valueNode?.value;
  if (typeof workflowId !== 'string' || !workflowId || isLiquidTemplate(workflowId)) return null;
  const childWorkflow = workflows[workflowId];
  const schema = childWorkflow?.inputsSchema;
  if (!schema?.properties || typeof schema.properties !== 'object') return null;
  return { step, childWorkflow, schema };
}

export function validateWorkflowInputs(
  workflowLookup: WorkflowLookup,
  workflows: WorkflowsResponse | null,
  lineCounter: LineCounter
): YamlValidationResult[] {
  if (!workflows) return [];

  const steps = Object.values(workflowLookup.steps).filter((step) =>
    WORKFLOW_EXECUTE_STEP_TYPES.includes(step.stepType)
  );

  const results: YamlValidationResult[] = [];
  for (const step of steps) {
    const ctx = getStepValidationContext(step, workflows.workflows);
    if (ctx) {
      results.push(...validateStepInputs(ctx.step, ctx.childWorkflow, ctx.schema, lineCounter));
    }
  }
  return results;
}
