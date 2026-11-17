/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { detectIndent } from '@kbn/workflows-yaml';
import {
  parseInputsToSchemaProperties,
  schemaPropertiesToJsonSchema,
  type SchemaPropertyField,
} from '../../../shared/ui/schema_property_builder';

export type ConstantType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ConstantField {
  readonly id: string;
  readonly name: string;
  readonly type: ConstantType;
  readonly value: string;
}

export interface OutputField {
  readonly id: string;
  readonly name: string;
  readonly type: SchemaPropertyField['type'];
  readonly description: string;
  /** Default value for the output (JSON Schema `default`). */
  readonly fallback: string;
  readonly properties?: readonly SchemaPropertyField[];
  readonly itemType?: SchemaPropertyField['type'];
  readonly itemProperties?: readonly SchemaPropertyField[];
}

let nextId = 0;
const createId = (prefix: string): string => {
  nextId += 1;
  return `${prefix}-${nextId}`;
};

export const createEmptyConstant = (overrides: Partial<ConstantField> = {}): ConstantField => ({
  id: createId('const'),
  name: '',
  type: 'string',
  value: '',
  ...overrides,
});

export const createEmptyOutput = (overrides: Partial<OutputField> = {}): OutputField => ({
  id: createId('output'),
  name: '',
  type: 'string',
  description: '',
  fallback: '',
  ...overrides,
});

const inferConstantType = (value: unknown): ConstantType => {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (value !== null && typeof value === 'object') return 'object';
  return 'string';
};

const valueToString = (value: unknown, type: ConstantType): string => {
  if (value === undefined || value === null) return '';
  if (type === 'object' || type === 'array') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const parseConstsToFields = (consts: unknown): ConstantField[] => {
  if (!consts || typeof consts !== 'object' || Array.isArray(consts)) return [];
  return Object.entries(consts as Record<string, unknown>).map(([name, value]) => {
    const type = inferConstantType(value);
    return createEmptyConstant({
      name,
      type,
      value: valueToString(value, type),
    });
  });
};

export const containsTemplateExpression = (raw: string): boolean => /\{\{/.test(raw);

export const coerceConstantValue = (
  type: ConstantType,
  raw: string
): { ok: true; value: unknown } | { ok: false; error: 'expression' | 'json' } => {
  if (containsTemplateExpression(raw)) {
    return { ok: false, error: 'expression' };
  }
  const trimmed = raw.trim();
  if (type === 'number') {
    if (!trimmed) return { ok: true, value: 0 };
    const n = Number(trimmed);
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: 'json' };
  }
  if (type === 'boolean') {
    if (trimmed === 'true') return { ok: true, value: true };
    if (trimmed === 'false') return { ok: true, value: false };
    return { ok: false, error: 'json' };
  }
  if (type === 'object' || type === 'array') {
    if (!trimmed) return { ok: true, value: type === 'array' ? [] : {} };
    try {
      const parsed = JSON.parse(trimmed);
      if (type === 'array' && !Array.isArray(parsed)) return { ok: false, error: 'json' };
      if (
        type === 'object' &&
        (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      ) {
        return { ok: false, error: 'json' };
      }
      return { ok: true, value: parsed };
    } catch {
      return { ok: false, error: 'json' };
    }
  }
  return { ok: true, value: raw };
};

export const constantsToYamlRecord = (
  fields: readonly ConstantField[]
): Record<string, unknown> | undefined => {
  const record: Record<string, unknown> = {};
  for (const field of fields) {
    const name = field.name.trim();
    if (!name) continue;
    const coerced = coerceConstantValue(field.type, field.value);
    if (!coerced.ok) continue;
    record[name] = coerced.value;
  }
  return Object.keys(record).length > 0 ? record : undefined;
};

export const parseOutputsToFields = (outputs: unknown): OutputField[] => {
  if (outputs == null) return [];
  if (Array.isArray(outputs)) {
    return outputs.map((raw) => {
      const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const type = typeof item.type === 'string' ? (item.type as OutputField['type']) : 'string';
      return createEmptyOutput({
        name: typeof item.name === 'string' ? item.name : '',
        type: ['string', 'number', 'boolean', 'date', 'object', 'array'].includes(type)
          ? type
          : 'string',
        description: typeof item.description === 'string' ? item.description : '',
        fallback:
          item.default === undefined || item.default === null
            ? ''
            : typeof item.default === 'string'
            ? item.default
            : JSON.stringify(item.default),
      });
    });
  }
  const parsed = parseInputsToSchemaProperties(outputs);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((prop) =>
    createEmptyOutput({
      name: prop.name,
      type: prop.type,
      description: prop.description,
      fallback: prop.defaultValue,
      properties: prop.properties,
      itemType: prop.itemType,
      itemProperties: prop.itemProperties,
    })
  );
};

/** Serialize outputs to JSON Schema; fallback maps to JSON Schema `default`. */
export const outputsToJsonSchema = (fields: readonly OutputField[]) => {
  const asSchemaProps: SchemaPropertyField[] = fields.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    description: f.description,
    mode: f.fallback.trim() ? 'default' : 'none',
    defaultValue: f.fallback,
    allowedValues: [],
    allowOtherValues: false,
    properties: f.properties,
    itemType: f.itemType,
    itemProperties: f.itemProperties,
  }));
  const schema = schemaPropertiesToJsonSchema(asSchemaProps);
  if (!schema.properties) return undefined;
  return Object.keys(schema.properties).length > 0 ? schema : undefined;
};

/** Patch root-level `consts` / `outputs` on the workflow YAML document. */
export const writeRootYamlMapping = (
  yamlString: string,
  key: 'consts' | 'outputs',
  value: unknown | undefined
): string => {
  try {
    const doc = parseDocument(yamlString);
    if (value === undefined) {
      doc.deleteIn([key]);
    } else {
      doc.setIn([key], doc.createNode(value));
    }
    // Keep the document's own indentation, as every other mutation does.
    return doc.toString({ indent: detectIndent(yamlString), lineWidth: 0 });
  } catch {
    return yamlString;
  }
};
