/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { type Document, isMap, isScalar, parseDocument, type YAMLMap } from 'yaml';
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

const hasOwn = (record: Record<string, unknown>, name: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, name);

/** True when the row still shows exactly what the YAML value would have produced. */
const isUnedited = (field: ConstantField, current: unknown): boolean => {
  const type = inferConstantType(current);
  return field.type === type && field.value === valueToString(current, type);
};

/** The `consts` the YAML has now (empty when it has none or cannot be read). */
export const readYamlConsts = (yamlString: string): Record<string, unknown> => {
  try {
    const consts = (parseDocument(yamlString).toJS() as Record<string, unknown> | null)?.consts;
    return consts && typeof consts === 'object' && !Array.isArray(consts)
      ? (consts as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

/**
 * The `consts` to write. A row nobody edited, or whose draft is not a valid value yet, keeps the
 * value the YAML already has for its name, so editing one constant never drops or rewrites another.
 */
export const constantsToYamlRecord = (
  fields: readonly ConstantField[],
  existing: Record<string, unknown> = {}
): Record<string, unknown> | undefined => {
  const record: Record<string, unknown> = {};
  for (const field of fields) {
    const name = field.name.trim();
    if (name) {
      const inYaml = hasOwn(existing, name);
      const coerced = coerceConstantValue(field.type, field.value);
      if (inYaml && (isUnedited(field, existing[name]) || !coerced.ok)) {
        record[name] = existing[name];
      } else if (coerced.ok) {
        record[name] = coerced.value;
      }
    }
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

const keyName = (pair: { key: unknown }): string =>
  isScalar(pair.key) ? String(pair.key.value) : String(pair.key);

/** Updates a mapping entry by entry, so comments and entries that did not change stay. */
const patchMapping = (doc: Document, node: YAMLMap, value: Record<string, unknown>): void => {
  const names = Object.keys(value);
  for (const pair of [...node.items]) {
    if (!names.includes(keyName(pair))) node.delete(keyName(pair));
  }
  for (const name of names) {
    const current: unknown = node.get(name, true);
    const currentValue =
      current !== null && typeof current === 'object' && 'toJSON' in current
        ? (current as { toJSON: () => unknown }).toJSON()
        : current;
    if (current === undefined || !isEqual(currentValue, value[name])) {
      node.set(name, doc.createNode(value[name]));
    }
  }
  node.items.sort((a, b) => names.indexOf(keyName(a)) - names.indexOf(keyName(b)));
};

/** Patch root-level `consts` / `outputs` on the workflow YAML document. */
export const writeRootYamlMapping = (
  yamlString: string,
  key: 'consts' | 'outputs',
  value: unknown | undefined
): string => {
  try {
    const doc = parseDocument(yamlString);
    const existing = doc.get(key, true);
    if (value === undefined) {
      doc.deleteIn([key]);
    } else if (isMap(existing) && value !== null && typeof value === 'object') {
      patchMapping(doc, existing, value as Record<string, unknown>);
    } else {
      doc.setIn([key], doc.createNode(value));
    }
    // Keep the document's own indentation, as every other mutation does.
    return doc.toString({ indent: detectIndent(yamlString), lineWidth: 0 });
  } catch {
    return yamlString;
  }
};
