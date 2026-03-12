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
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { convertJsonSchemaToZodWithRefs } from '../../../../common/lib/json_schema_to_zod';
import { isDynamicValue } from '../../../../common/lib/regex';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import {
  getValueFromValueNode,
  type StepInfo,
  type WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../model/types';

const WORKFLOW_EXECUTE_STEP_TYPES = ['workflow.execute', 'workflow.executeAsync'];
const WITH_INPUTS_PREFIX = 'with.inputs.';

function createUnknownKeyResult(
  step: StepInfo,
  topLevelInputName: string,
  childWorkflow: { name: string },
  schemaPropertyNames: Set<string>,
  propInfo: StepInfo['propInfos'][string],
  lineCounter: LineCounter
): YamlValidationResult | null {
  const keyRange = propInfo.keyNode?.range;
  if (!keyRange) return null;
  const startPos = lineCounter.linePos(keyRange[0]);
  const endPos = lineCounter.linePos(keyRange[1]);
  return {
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
  };
}

function createTypeErrorResult(
  step: StepInfo,
  topLevelInputName: string,
  childWorkflow: { name: string },
  propInfo: StepInfo['propInfos'][string],
  lineCounter: LineCounter,
  errorMessages: string
): YamlValidationResult | null {
  const valueRange = propInfo.valueNode?.range ?? propInfo.keyNode?.range;
  if (!valueRange) return null;
  const startPos = lineCounter.linePos(valueRange[0]);
  const endPos = lineCounter.linePos(valueRange[1]);
  return {
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
  };
}

function createMissingRequiredResult(
  step: StepInfo,
  requiredName: string,
  childWorkflow: { name: string },
  range: [number, number] | undefined,
  lineCounter: LineCounter
): YamlValidationResult | null {
  if (!range) return null;
  const startPos = lineCounter.linePos(range[0]);
  const endPos = lineCounter.linePos(range[1]);
  return {
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
  };
}

function processOneInputEntry(
  step: StepInfo,
  inputPath: string,
  propInfo: StepInfo['propInfos'][string],
  schemaPropertyNames: Set<string>,
  childWorkflow: { id: string; name: string },
  schema: JsonModelSchemaType,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const topLevelInputName = inputPath.split('.')[0];
  if (inputPath !== topLevelInputName) {
    return [];
  }
  if (!schemaPropertyNames.has(topLevelInputName)) {
    const result = createUnknownKeyResult(
      step,
      topLevelInputName,
      childWorkflow,
      schemaPropertyNames,
      propInfo,
      lineCounter
    );
    return result ? [result] : [];
  }
  const rawValue = getValueFromValueNode(propInfo.valueNode);
  if (isDynamicValue(rawValue) || !schema.properties) {
    return [];
  }
  const propSchemaRaw = schema.properties[topLevelInputName];
  if (!propSchemaRaw || typeof propSchemaRaw !== 'object') {
    return [];
  }
  const errorMessages = validateInputValueType(rawValue, propSchemaRaw as JSONSchema7, schema);
  if (!errorMessages) {
    return [];
  }
  const result = createTypeErrorResult(
    step,
    topLevelInputName,
    childWorkflow,
    propInfo,
    lineCounter,
    errorMessages
  );
  return result ? [result] : [];
}

function validateInputValueType(
  rawValue: unknown,
  propSchema: JSONSchema7,
  schema: JsonModelSchemaType
): string | null {
  try {
    const zodSchema = convertJsonSchemaToZodWithRefs(propSchema, schema);
    const parseResult = zodSchema.safeParse(rawValue);
    if (!parseResult.success) {
      return parseResult.error.issues.map((issue) => issue.message).join('; ');
    }
  } catch {
    // Gracefully skip type validation for schemas that convertJsonSchemaToZodWithRefs
    // cannot handle (e.g. unsupported combinators, unresolvable $ref chains).
    // Returning null means "no type error detected" so the user is not blocked.
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

  // with.inputs appears in propInfos only when it is a scalar (e.g. liquid template).
  // When it is a map we have with.inputs.foo, with.inputs.bar etc. and no with.inputs entry.
  const inputsProp = step.propInfos['with.inputs'];
  const inputsValue = inputsProp ? getValueFromValueNode(inputsProp.valueNode) : undefined;
  if (inputsProp && typeof inputsValue === 'string' && isDynamicValue(inputsValue)) {
    return results;
  }

  const inputEntries = Object.entries(step.propInfos).filter(([key]) =>
    key.startsWith(WITH_INPUTS_PREFIX)
  );

  for (const [propKey, propInfo] of inputEntries) {
    const inputPath = propKey.slice(WITH_INPUTS_PREFIX.length);
    if (inputPath !== '') {
      const topLevelInputName = inputPath.split('.')[0];
      providedInputNames.add(topLevelInputName);
      results.push(
        ...processOneInputEntry(
          step,
          inputPath,
          propInfo,
          schemaPropertyNames,
          childWorkflow,
          schema,
          lineCounter
        )
      );
    }
  }

  // When inputs is a map, propInfos has no 'with.inputs' entry; use first with.inputs.* child or workflow-id
  const firstInputChildKey = Object.keys(step.propInfos).find(
    (k) => k.startsWith(WITH_INPUTS_PREFIX) && k.length > WITH_INPUTS_PREFIX.length
  );
  const firstInputChildProp = firstInputChildKey ? step.propInfos[firstInputChildKey] : undefined;
  const missingRequiredAnchor =
    inputsProp?.keyNode ??
    inputsProp?.valueNode ??
    firstInputChildProp?.keyNode ??
    workflowIdProp.valueNode ??
    workflowIdProp.keyNode;

  results.push(
    ...getMissingRequiredResults(
      step,
      childWorkflow,
      requiredNames,
      providedInputNames,
      missingRequiredAnchor,
      lineCounter
    )
  );

  return results;
}

function getMissingRequiredResults(
  step: StepInfo,
  childWorkflow: { name: string },
  requiredNames: Set<string>,
  providedInputNames: Set<string>,
  anchorNode: { range?: unknown } | null | undefined,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const range =
    anchorNode?.range && Array.isArray(anchorNode.range) && anchorNode.range.length >= 2
      ? ([anchorNode.range[0], anchorNode.range[1]] as [number, number])
      : undefined;
  const out: YamlValidationResult[] = [];
  for (const requiredName of requiredNames) {
    if (!providedInputNames.has(requiredName)) {
      const result = createMissingRequiredResult(
        step,
        requiredName,
        childWorkflow,
        range,
        lineCounter
      );
      if (result) out.push(result);
    }
  }
  return out;
}

function createWorkflowNotFoundResult(
  step: StepInfo,
  workflowId: string,
  lineCounter: LineCounter
): YamlValidationResult | null {
  const workflowIdProp = step.propInfos['with.workflow-id'];
  if (!workflowIdProp) return null;
  const valueRange = workflowIdProp.valueNode?.range ?? workflowIdProp.keyNode?.range;
  if (!valueRange) return null;
  const startPos = lineCounter.linePos(valueRange[0]);
  const endPos = lineCounter.linePos(valueRange[1]);
  return {
    id: `workflow-inputs-not-found-${step.stepId}`,
    severity: 'error',
    message: i18n.translate('workflows.validateWorkflowInputs.workflowNotFound', {
      defaultMessage: 'Workflow not found for id "{workflowId}"',
      values: { workflowId },
    }),
    owner: 'workflow-inputs-validation',
    startLineNumber: startPos.line,
    startColumn: startPos.col,
    endLineNumber: endPos.line,
    endColumn: endPos.col,
    hoverMessage: null,
  };
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
  const workflowId = getValueFromValueNode(workflowIdProp.valueNode);
  if (typeof workflowId !== 'string' || !workflowId || isDynamicValue(workflowId)) return null;
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
    } else {
      const workflowIdProp = step.propInfos['with.workflow-id'];
      const workflowId = workflowIdProp
        ? getValueFromValueNode(workflowIdProp.valueNode)
        : undefined;
      if (
        typeof workflowId === 'string' &&
        workflowId.length > 0 &&
        !isDynamicValue(workflowId) &&
        !workflows.workflows[workflowId]
      ) {
        const notFoundResult = createWorkflowNotFoundResult(step, workflowId, lineCounter);
        if (notFoundResult) results.push(notFoundResult);
      }
    }
  }
  return results;
}
