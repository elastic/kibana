/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { isEqual, omit } from 'lodash';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  getInputsFromDefinition,
  normalizeFieldsToJsonSchema,
  resolveRef,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { isRecord } from '@kbn/workflows-yaml';
import {
  collectReturnedOutputNames,
  collectWorkflowOutputBlocks,
  hasWorkflowOutputStep,
} from './find_call_sites';
import type { ContractChange, ContractField, WorkflowContract } from './types';

const describeType = (property: JSONSchema7, schema: JsonModelSchemaType): string | undefined => {
  const resolved = property.$ref ? resolveRef(property.$ref, schema) ?? property : property;
  if (Array.isArray(resolved.type)) {
    return resolved.type.join(' | ');
  }
  return resolved.type;
};

const toFields = (schema: JsonModelSchemaType | undefined): Record<string, ContractField> => {
  const fields: Record<string, ContractField> = {};
  if (!schema?.properties) {
    return fields;
  }
  const required = new Set(schema.required ?? []);
  for (const [name, rawProperty] of Object.entries(schema.properties)) {
    const property = (isRecord(rawProperty) ? rawProperty : {}) as JSONSchema7;
    fields[name] = {
      name,
      type: describeType(property, schema),
      required: required.has(name),
      hasDefault: property.default !== undefined,
      enumValues: property.enum,
      schema: property,
    };
  }
  return fields;
};

const inferOutputFields = (definition: unknown): Record<string, ContractField> => {
  const fields: Record<string, ContractField> = {};
  for (const block of collectWorkflowOutputBlocks(definition)) {
    for (const name of Object.keys(block)) {
      fields[name] = { name, required: false, hasDefault: false };
    }
  }
  return fields;
};

/** Extracts the input/output contract a workflow exposes to the workflows that call it. */
export const extractWorkflowContract = (definition: unknown): WorkflowContract => {
  const inputsSchema = getInputsFromDefinition(
    isRecord(definition) ? (definition as Partial<WorkflowYaml>) : undefined
  );
  const declaredOutputs = normalizeFieldsToJsonSchema(
    isRecord(definition) ? definition.outputs : undefined
  );
  const returnedNames = collectReturnedOutputNames(definition);

  const base = {
    // A workflow saved with errors is stored without a definition (and turned off).
    valid: isRecord(definition),
    enabled: isRecord(definition) && definition.enabled !== false,
    inputs: toFields(inputsSchema),
    hasDeclaredInputs: Boolean(inputsSchema?.properties),
    inputsSchema: inputsSchema?.properties ? inputsSchema : undefined,
    rejectsUnknownInputs: inputsSchema?.additionalProperties === false,
    hasOutputStep: hasWorkflowOutputStep(definition),
    returnedOutputs: returnedNames ? [...returnedNames] : undefined,
  };

  if (declaredOutputs?.properties) {
    const outputs = toFields(declaredOutputs);
    return {
      ...base,
      outputs,
      outputsSource: 'declared',
      unreturnedOutputs: returnedNames
        ? Object.keys(outputs).filter((name) => !returnedNames.has(name))
        : [],
    };
  }

  const inferredOutputs = inferOutputFields(definition);
  return {
    ...base,
    outputs: inferredOutputs,
    outputsSource: Object.keys(inferredOutputs).length > 0 ? 'inferred' : 'none',
    unreturnedOutputs: [],
  };
};

const toTypeSet = (type?: string): string[] | undefined => type?.split(' | ');

const acceptsType = (accepted: readonly string[], type: string): boolean =>
  accepted.includes(type) || (type === 'integer' && accepted.includes('number'));

/** True when every value of type `inner` is also a valid `outer`; an undefined type means any value. */
export const isTypeWithin = (inner?: string, outer?: string): boolean => {
  const outerTypes = toTypeSet(outer);
  if (!outerTypes) {
    return true;
  }
  const innerTypes = toTypeSet(inner);
  return innerTypes ? innerTypes.every((type) => acceptsType(outerTypes, type)) : false;
};

/** True when some values are valid for both types. */
export const typesOverlap = (first?: string, second?: string): boolean => {
  const firstTypes = toTypeSet(first);
  const secondTypes = toTypeSet(second);
  if (!firstTypes || !secondTypes) {
    return true;
  }
  return firstTypes.some(
    (type) =>
      acceptsType(secondTypes, type) || (type === 'number' && secondTypes.includes('integer'))
  );
};

const isEnumWithin = (inner?: readonly unknown[], outer?: readonly unknown[]): boolean => {
  if (!outer) {
    return true;
  }
  return inner ? inner.every((value) => outer.some((allowed) => isEqual(allowed, value))) : false;
};

// Everything about a field's schema other than what is compared on its own.
const SEPARATELY_COMPARED_KEYS = ['type', 'enum', 'default', 'description', 'title', 'examples'];
/** True when nested shapes or constraints of a field changed (anything but type, enum and docs). */
export const hasSchemaDetailChange = (saved: ContractField, draft: ContractField): boolean =>
  !isEqual(
    omit(saved.schema ?? {}, SEPARATELY_COMPARED_KEYS),
    omit(draft.schema ?? {}, SEPARATELY_COMPARED_KEYS)
  );

/** True when the draft field accepts fewer values than the saved one at the type or enum level. */
export const isFieldNarrowed = (saved: ContractField, draft: ContractField): boolean =>
  !isTypeWithin(saved.type, draft.type) || !isEnumWithin(saved.enumValues, draft.enumValues);

const isBlockingRequired = (field: ContractField): boolean => field.required && !field.hasDefault;

const diffInputField = (savedField: ContractField, draftField: ContractField): ContractChange[] => {
  const { name } = draftField;
  const changes: ContractChange[] = [];
  if (!isBlockingRequired(savedField) && isBlockingRequired(draftField)) {
    changes.push({ kind: 'inputBecameRequired', field: name, severity: 'breaking' });
  } else if (isBlockingRequired(savedField) && !isBlockingRequired(draftField)) {
    changes.push({ kind: 'inputBecameOptional', field: name, severity: 'info' });
  }
  if (savedField.type !== draftField.type) {
    changes.push({
      kind: 'inputTypeChanged',
      field: name,
      severity: isTypeWithin(savedField.type, draftField.type) ? 'info' : 'breaking',
      from: savedField.type,
      to: draftField.type,
    });
  }
  if (!isEqual(savedField.enumValues, draftField.enumValues)) {
    changes.push({
      kind: 'inputAllowedValuesChanged',
      field: name,
      severity: isEnumWithin(savedField.enumValues, draftField.enumValues) ? 'info' : 'breaking',
    });
  }
  if (hasSchemaDetailChange(savedField, draftField)) {
    changes.push({ kind: 'inputSchemaChanged', field: name, severity: 'warning' });
  }
  return changes;
};

const diffInputs = (saved: WorkflowContract, draft: WorkflowContract): ContractChange[] => {
  const changes: ContractChange[] = [];
  for (const [name, draftField] of Object.entries(draft.inputs)) {
    const savedField = saved.inputs[name];
    if (savedField) {
      changes.push(...diffInputField(savedField, draftField));
    } else {
      const required = isBlockingRequired(draftField);
      changes.push({
        kind: 'inputAdded',
        field: name,
        severity: required ? 'breaking' : 'info',
        to: draftField.type,
        required,
      });
    }
  }
  for (const name of Object.keys(saved.inputs)) {
    if (!draft.inputs[name]) {
      changes.push({
        kind: 'inputRemoved',
        field: name,
        // Undeclared inputs are dropped, unless the schema rejects them.
        severity: draft.rejectsUnknownInputs ? 'breaking' : 'warning',
      });
    }
  }
  if (!saved.rejectsUnknownInputs && draft.rejectsUnknownInputs) {
    changes.push({ kind: 'unknownInputsRejected', field: '', severity: 'warning' });
  }
  return changes;
};

const diffOutputs = (saved: WorkflowContract, draft: WorkflowContract): ContractChange[] => {
  const changes: ContractChange[] = [];
  const savedUnreturned = new Set(saved.unreturnedOutputs);
  const draftUnreturned = new Set(draft.unreturnedOutputs);
  for (const [name, draftField] of Object.entries(draft.outputs)) {
    const savedField = saved.outputs[name];
    if (savedField && !savedUnreturned.has(name) && draftUnreturned.has(name)) {
      changes.push({ kind: 'outputNoLongerReturned', field: name, severity: 'breaking' });
    }
    if (!savedField) {
      changes.push({ kind: 'outputAdded', field: name, severity: 'info', to: draftField.type });
    } else {
      if (savedField.type && savedField.type !== draftField.type) {
        changes.push({
          kind: 'outputTypeChanged',
          field: name,
          // Callers only notice when the output can now hold values it couldn't before.
          severity: isTypeWithin(draftField.type, savedField.type) ? 'info' : 'warning',
          from: savedField.type,
          to: draftField.type,
        });
      }
      if (hasSchemaDetailChange(savedField, draftField)) {
        changes.push({ kind: 'outputSchemaChanged', field: name, severity: 'warning' });
      }
    }
  }
  for (const name of Object.keys(saved.outputs)) {
    if (!draft.outputs[name]) {
      changes.push({
        kind: 'outputRemoved',
        field: name,
        // Undeclared values a `workflow.output` step sets still reach callers.
        severity: draft.returnedOutputs?.includes(name) ? 'warning' : 'breaking',
      });
    }
  }
  if (saved.hasOutputStep && !draft.hasOutputStep && Object.keys(saved.outputs).length > 0) {
    changes.push({ kind: 'outputStepRemoved', field: '', severity: 'warning' });
  }
  return changes;
};

const getStateChanges = (saved: WorkflowContract, draft: WorkflowContract): ContractChange[] => {
  if (saved.valid && !draft.valid) {
    return [{ kind: 'invalid', field: '', severity: 'breaking' }];
  }
  if (saved.enabled && !draft.enabled) {
    return [{ kind: 'disabled', field: '', severity: 'breaking' }];
  }
  return [];
};

const SEVERITY_ORDER = { breaking: 0, warning: 1, info: 2 } as const;

/** Lists the contract changes between the saved and the draft version of a workflow. */
export const diffWorkflowContracts = (
  saved: WorkflowContract,
  draft: WorkflowContract
): ContractChange[] =>
  [
    ...getStateChanges(saved, draft),
    ...diffInputs(saved, draft),
    ...diffOutputs(saved, draft),
  ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
