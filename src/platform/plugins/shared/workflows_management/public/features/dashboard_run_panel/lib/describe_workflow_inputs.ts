/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import {
  DASHBOARD_QUERY_INPUT_DEFINITION_ID,
  DASHBOARD_TIME_RANGE_INPUT_DEFINITION_ID,
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
} from '@kbn/workflows';
import { resolveRef } from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import type { WorkflowRunInputMapping } from '../../../../server/dashboard_run_panel/schema';

export type ScalarInputKind = 'string' | 'date' | 'number' | 'integer' | 'boolean' | 'enum';

export type WorkflowInputKind =
  | ScalarInputKind
  | 'array'
  | 'time_range'
  | 'query'
  | 'object'
  | 'unknown';

export type EnumValue = string | number;

export interface WorkflowInputDescriptor {
  name: string;
  label: string;
  description?: string;
  kind: WorkflowInputKind;
  required: boolean;
  enumValues?: EnumValue[];
  /** Kind of the array items, for `array` inputs. */
  itemKind?: ScalarInputKind | 'unknown';
  itemEnumValues?: EnumValue[];
  defaultValue?: unknown;
}

export type WorkflowRunMappingSource = WorkflowRunInputMapping['source'];

const TIME_RANGE_REF = `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${DASHBOARD_TIME_RANGE_INPUT_DEFINITION_ID}`;
const QUERY_REF = `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${DASHBOARD_QUERY_INPUT_DEFINITION_ID}`;

const asSchema = (definition: JSONSchema7Definition | undefined): JSONSchema7 | undefined =>
  definition && typeof definition === 'object' ? definition : undefined;

const toEnumValues = (values: JSONSchema7['enum']): EnumValue[] | undefined => {
  const enumValues = (values ?? []).filter(
    (value): value is EnumValue => typeof value === 'string' || typeof value === 'number'
  );
  return enumValues.length > 0 ? enumValues : undefined;
};

const scalarKind = (schema: JSONSchema7): ScalarInputKind | undefined => {
  if (toEnumValues(schema.enum)) {
    return 'enum';
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  switch (type) {
    case 'string':
      return schema.format === 'date-time' || schema.format === 'date' ? 'date' : 'string';
    case 'number':
    case 'integer':
    case 'boolean':
      return type;
    default:
      return undefined;
  }
};

const describeSchema = (
  schema: JSONSchema7,
  root: JsonModelSchemaType
): Pick<WorkflowInputDescriptor, 'kind' | 'enumValues' | 'itemKind' | 'itemEnumValues'> => {
  if (schema.$ref === TIME_RANGE_REF) {
    return { kind: 'time_range' };
  }
  if (schema.$ref === QUERY_REF) {
    return { kind: 'query' };
  }
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, root);
    return resolved ? describeSchema({ ...resolved, $ref: undefined }, root) : { kind: 'unknown' };
  }

  const kind = scalarKind(schema);
  if (kind) {
    return { kind, enumValues: kind === 'enum' ? toEnumValues(schema.enum) : undefined };
  }
  if (schema.type === 'array') {
    const items = asSchema(Array.isArray(schema.items) ? schema.items[0] : schema.items);
    const itemKind = items ? scalarKind(items) : undefined;
    return {
      kind: 'array',
      itemKind: itemKind ?? 'unknown',
      itemEnumValues: itemKind === 'enum' && items ? toEnumValues(items.enum) : undefined,
    };
  }
  if (schema.type === 'object') {
    return { kind: 'object' };
  }
  return { kind: 'unknown' };
};

/** Describes the top-level inputs of a workflow's manual trigger, in declaration order. */
export const describeWorkflowInputs = (
  inputs: JsonModelSchemaType | undefined
): WorkflowInputDescriptor[] => {
  if (!inputs?.properties) {
    return [];
  }
  const required = new Set(inputs.required ?? []);
  return Object.entries(inputs.properties).map(([name, definition]) => {
    const schema = asSchema(definition as JSONSchema7Definition) ?? {};
    return {
      name,
      label: schema.title ?? name,
      description: schema.description,
      required: required.has(name),
      defaultValue: schema.default,
      ...describeSchema(schema, inputs),
    };
  });
};

const VALUE_SOURCES: readonly WorkflowRunMappingSource[] = ['control', 'constant'];

/** The mapping sources that can fill an input of this kind. */
export const getAllowedMappingSources = (
  descriptor: WorkflowInputDescriptor
): readonly WorkflowRunMappingSource[] => {
  switch (descriptor.kind) {
    case 'time_range':
      return ['time_range'];
    case 'query':
      return ['query'];
    case 'date':
      return ['time_range', 'constant'];
    case 'boolean':
      return ['constant'];
    case 'object':
    case 'unknown':
      return [];
    case 'array':
      return descriptor.itemKind === 'unknown' ? [] : VALUE_SOURCES;
    default:
      return VALUE_SOURCES;
  }
};
