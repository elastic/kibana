/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import type { JsonSchema } from '@kbn/workflows/spec/schema/common/json_model_shape_schema';
import {
  SCALAR_SCHEMA_PROPERTY_TYPES,
  type SchemaPropertyField,
  type SchemaPropertyMode,
  type SchemaPropertyNameError,
  type SchemaPropertyType,
} from './types';

let nextId = 0;
const createId = (): string => {
  nextId += 1;
  return `schema-prop-${nextId}`;
};

export const createEmptySchemaProperty = (
  overrides: Partial<SchemaPropertyField> = {}
): SchemaPropertyField => ({
  id: createId(),
  name: '',
  type: 'string',
  description: '',
  mode: 'none',
  defaultValue: '',
  allowedValues: [],
  allowOtherValues: false,
  ...overrides,
});

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const validateSchemaPropertyName = (
  name: string,
  siblings: readonly SchemaPropertyField[],
  selfId: string
): SchemaPropertyNameError | null => {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';
  if (!IDENTIFIER_RE.test(trimmed)) return 'invalid';
  const duplicate = siblings.some(
    (s) => s.id !== selfId && s.name.trim() === trimmed
  );
  if (duplicate) return 'duplicate';
  return null;
};

const readType = (schema: JsonSchema): SchemaPropertyType => {
  if (schema.format === 'date' || schema.format === 'date-time') return 'date';
  const t = schema.type;
  if (t === 'number' || t === 'integer') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'object') return 'object';
  if (t === 'array') return 'array';
  return 'string';
};

const defaultToString = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const coerceDefault = (type: SchemaPropertyType, raw: string): unknown => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (type === 'number') {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (type === 'boolean') {
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    return trimmed;
  }
  if (type === 'object' || type === 'array') {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

const enumToStrings = (values: unknown[] | undefined): string[] => {
  if (!values) return [];
  return values.map((v) => (typeof v === 'string' ? v : String(v)));
};

const parseProperty = (
  name: string,
  schema: JsonSchema,
  requiredNames: ReadonlySet<string>
): SchemaPropertyField => {
  const type = readType(schema);
  const enumValues = Array.isArray(schema.enum) ? enumToStrings(schema.enum) : [];
  const examplesRaw = (schema as { examples?: unknown }).examples;
  const examples = Array.isArray(examplesRaw) ? enumToStrings(examplesRaw) : [];
  const hasEnum = enumValues.length > 0;
  const allowedValues = hasEnum ? enumValues : examples;
  const allowOtherValues = !hasEnum && examples.length > 0;

  let properties: SchemaPropertyField[] | undefined;
  if (type === 'object' && schema.properties) {
    const nestedRequired = new Set(schema.required ?? []);
    properties = Object.entries(schema.properties).map(([childName, childSchema]) =>
      parseProperty(childName, childSchema as JsonSchema, nestedRequired)
    );
  }

  let itemType: SchemaPropertyType | undefined;
  let itemProperties: SchemaPropertyField[] | undefined;
  if (type === 'array') {
    const items = Array.isArray(schema.items) ? schema.items[0] : schema.items;
    if (items && typeof items === 'object') {
      itemType = readType(items as JsonSchema);
      if (itemType === 'object' && (items as JsonSchema).properties) {
        const nestedRequired = new Set((items as JsonSchema).required ?? []);
        itemProperties = Object.entries((items as JsonSchema).properties!).map(
          ([childName, childSchema]) =>
            parseProperty(childName, childSchema as JsonSchema, nestedRequired)
        );
      }
    } else {
      itemType = 'string';
    }
  }

  const isRequired = requiredNames.has(name);
  const parsedDefault = defaultToString(schema.default);
  // Prefer required over default when both appear in legacy YAML.
  const mode: SchemaPropertyMode = isRequired
    ? 'required'
    : parsedDefault.trim()
      ? 'default'
      : 'none';

  return {
    id: createId(),
    name,
    type,
    description: typeof schema.description === 'string' ? schema.description : '',
    mode,
    defaultValue: mode === 'default' ? parsedDefault : '',
    allowedValues,
    allowOtherValues,
    properties,
    itemType,
    itemProperties,
  };
};

/**
 * Returns true when the schema can be edited by the visual builder (no $ref /
 * composition keywords the builder does not author).
 */
export const isBuilderEditableSchema = (schema: JsonModelSchemaType | undefined): boolean => {
  if (!schema?.properties) return true;
  const walk = (node: JsonSchema): boolean => {
    if (!node || typeof node !== 'object') return true;
    if (node.$ref || node.anyOf || node.oneOf) return false;
    if (node.properties) {
      for (const child of Object.values(node.properties)) {
        if (!walk(child as JsonSchema)) return false;
      }
    }
    if (node.items) {
      const items = Array.isArray(node.items) ? node.items : [node.items];
      for (const item of items) {
        if (item && typeof item === 'object' && !walk(item as JsonSchema)) return false;
      }
    }
    return true;
  };
  return walk(schema as JsonSchema);
};

/** Parse workflow trigger `inputs` (legacy array or JSON Schema) into builder fields. */
export const parseInputsToSchemaProperties = (
  inputs: unknown
): SchemaPropertyField[] | 'unsupported' => {
  if (inputs == null) return [];
  const normalized = normalizeFieldsToJsonSchema(inputs);
  if (!normalized) return [];
  if (!isBuilderEditableSchema(normalized)) return 'unsupported';
  const required = new Set(normalized.required ?? []);
  return Object.entries(normalized.properties ?? {}).map(([name, schema]) =>
    parseProperty(name, schema as JsonSchema, required)
  );
};

const propertyToJsonSchema = (field: SchemaPropertyField): JsonSchema => {
  const schema: JsonSchema = {};

  if (field.type === 'date') {
    schema.type = 'string';
    schema.format = 'date';
  } else if (field.type === 'number') {
    schema.type = 'number';
  } else if (field.type === 'boolean') {
    schema.type = 'boolean';
  } else if (field.type === 'object') {
    schema.type = 'object';
  } else if (field.type === 'array') {
    schema.type = 'array';
  } else {
    schema.type = 'string';
  }

  if (field.description.trim()) {
    schema.description = field.description.trim();
  }

  if (field.mode === 'default') {
    const def = coerceDefault(field.type, field.defaultValue);
    if (def !== undefined) schema.default = def as JsonSchema['default'];
  }

  if (SCALAR_SCHEMA_PROPERTY_TYPES.has(field.type) && field.allowedValues.length > 0) {
    const values = [...field.allowedValues];
    if (field.allowOtherValues) {
      Object.assign(schema, { examples: values });
    } else {
      schema.enum = values;
    }
  }

  if (field.type === 'object') {
    const nested = schemaPropertiesToJsonSchema(field.properties ?? []);
    schema.properties = nested.properties;
    if (nested.required?.length) schema.required = nested.required;
  }

  if (field.type === 'array') {
    const itemType = field.itemType ?? 'string';
    if (itemType === 'object') {
      const nested = schemaPropertiesToJsonSchema(field.itemProperties ?? []);
      schema.items = {
        type: 'object',
        properties: nested.properties,
        ...(nested.required?.length ? { required: nested.required } : {}),
      };
    } else if (itemType === 'date') {
      schema.items = { type: 'string', format: 'date' };
    } else if (itemType === 'number') {
      schema.items = { type: 'number' };
    } else if (itemType === 'boolean') {
      schema.items = { type: 'boolean' };
    } else {
      schema.items = { type: 'string' };
    }
  }

  return schema;
};

/**
 * Serialize builder fields to JSON Schema.
 * // TODO(engine): confirm inputs schema shape — required is a parent-level
 * array; "required" means the caller must supply a non-empty value (engine
 * enforcement), not merely that the key is present.
 */
export const schemaPropertiesToJsonSchema = (
  fields: readonly SchemaPropertyField[]
): JsonModelSchemaType => {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const field of fields) {
    const name = field.name.trim();
    if (!name) continue;
    properties[name] = propertyToJsonSchema(field);
    if (field.mode === 'required') required.push(name);
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
};

/** Switch mode; clears the stored default unless selecting "Use a default". */
export const applyModeChange = (
  field: SchemaPropertyField,
  mode: SchemaPropertyMode
): SchemaPropertyField => {
  if (mode === 'default') {
    return { ...field, mode };
  }
  return { ...field, mode, defaultValue: '' };
};

/** Clear mode/default / allowed values that are incompatible after a type change. */
export const applyTypeChange = (
  field: SchemaPropertyField,
  nextType: SchemaPropertyType
): SchemaPropertyField => {
  const next: SchemaPropertyField = {
    ...field,
    type: nextType,
    mode: 'none',
    defaultValue: '',
    allowedValues: [],
    allowOtherValues: false,
    properties: nextType === 'object' ? field.properties ?? [] : undefined,
    itemType: nextType === 'array' ? field.itemType ?? 'string' : undefined,
    itemProperties:
      nextType === 'array' && (field.itemType ?? 'string') === 'object'
        ? field.itemProperties ?? []
        : undefined,
  };
  return next;
};

/**
 * Find step names that reference `prefix.<name>` (or nested paths under it)
 * in the workflow YAML document.
 */
export const findStepsReferencingPath = (
  workflowYaml: string,
  prefix: string,
  name: string
): string[] => {
  if (!name.trim() || !workflowYaml) return [];
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const refRe = new RegExp(`${escapedPrefix}\\.${escaped}(?:\\b|[^A-Za-z0-9_])`);
  const steps: string[] = [];
  const lines = workflowYaml.split('\n');
  let currentStep: string | null = null;
  const seen = new Set<string>();
  for (const line of lines) {
    const nameMatch = line.match(/^\s*-\s*name:\s*['"]?([A-Za-z0-9_]+)['"]?\s*$/);
    if (nameMatch) {
      currentStep = nameMatch[1];
      continue;
    }
    const bareName = line.match(/^\s+name:\s*['"]?([A-Za-z0-9_]+)['"]?\s*$/);
    if (bareName && currentStep === null) {
      currentStep = bareName[1];
    }
    if (currentStep && refRe.test(line) && !seen.has(currentStep)) {
      seen.add(currentStep);
      steps.push(currentStep);
    }
  }
  if (steps.length === 0 && refRe.test(workflowYaml)) {
    return ['(workflow)'];
  }
  return steps;
};

/**
 * Find step names that reference `inputs.<name>` (or nested paths under it)
 * in the workflow YAML document.
 */
export const findStepsReferencingInput = (
  workflowYaml: string,
  inputName: string
): string[] => findStepsReferencingPath(workflowYaml, 'inputs', inputName);
