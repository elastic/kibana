/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBuiltInStepDefinition } from '@kbn/workflows';
import type { ConnectorContractUnion } from '@kbn/workflows';
import { unwrapSchema } from '@kbn/workflows/common/utils/zod';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { prettifyCatalogKey } from '../../../shared/utils/catalog_display_name';

/**
 * How a field renders in the step configuration form. `code` fields get a
 * Monaco editor in `language`; everything else is a plain EUI control.
 */
export type StepFieldKind = 'text' | 'number' | 'boolean' | 'select' | 'code';
export type StepFieldLanguage = 'json' | 'kuery' | 'plaintext';

export interface StepFormField {
  /** Key inside its owner (`with.<key>` or a root step key). */
  readonly key: string;
  /** Full path from the step mapping, e.g. `['with', 'message']`. */
  readonly path: readonly string[];
  /** Humanized / schema display label (never a raw camelCase/kebab key). */
  readonly label: string;
  readonly description?: string;
  readonly required: boolean;
  /**
   * Curated importance hint. `true` → Advanced; `false` → promote an optional
   * into Configuration. When omitted, required → Configuration and optional →
   * Advanced. Required fields always stay in Configuration.
   */
  readonly advanced?: boolean;
  readonly kind: StepFieldKind;
  readonly language?: StepFieldLanguage;
  readonly options?: readonly string[];
  /** Schema default (from `.default()`), used to pre-fill new steps. */
  readonly defaultValue?: unknown;
}

export interface StepFormSchema {
  readonly stepType: string;
  readonly fields: readonly StepFormField[];
}

/** Field-label alias for the shared catalog key prettifier. */
export const prettifyFieldKey = prettifyCatalogKey;

/** True when the display label is more than a casing/spacing variant of the key. */
export function fieldLabelDivergesFromKey(key: string, label: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, '');
  return normalize(key) !== normalize(label);
}

/** Keys rendered in Monaco regardless of their scalar type. */
const CODE_KEY_LANGUAGE: Readonly<Record<string, StepFieldLanguage>> = {
  condition: 'kuery',
  query: 'json',
  body: 'json',
  aggs: 'json',
  aggregations: 'json',
  script: 'json',
  prompt: 'plaintext',
};

/** Transport-only params that would only add noise to the form. */
const HIDDEN_KEYS = new Set(['pretty', 'human', 'error_trace', 'source', 'filter_path']);

const isRequired = (schema: z.ZodType): boolean => !schema.safeParse(undefined).success;

/** Prefer schema meta title/label; otherwise prettify the key. */
const resolveFieldLabel = (key: string, schema: z.ZodType): string => {
  const meta = readFieldMeta(schema);
  if (meta) {
    if (typeof meta.title === 'string' && meta.title.trim()) return meta.title.trim();
    if (typeof meta.label === 'string' && meta.label.trim()) return meta.label.trim();
  }
  return prettifyFieldKey(key);
};

const readFieldMeta = (schema: z.ZodType): Record<string, unknown> | undefined => {
  const readMeta = (s: z.ZodType): Record<string, unknown> | undefined => {
    const metaFn = (s as { meta?: () => Record<string, unknown> }).meta;
    if (typeof metaFn === 'function') {
      const meta = metaFn.call(s);
      if (meta && typeof meta === 'object') return meta;
    }
    return undefined;
  };
  for (const candidate of [schema, unwrapSchema(schema)]) {
    const meta = readMeta(candidate as z.ZodType);
    if (meta) return meta;
  }
  return undefined;
};

/**
 * Curated `with.*` keys that belong in Advanced until schemas carry meta.
 * TODO(catalog): migrate into schema `.meta({ advanced: true })` and delete this map.
 *
 * For types listed here, every other key is treated as `advanced: false`
 * (promoted into Configuration) so essential optionals (e.g. http url/method)
 * stay inline without a requiredness-only split burying them.
 */
const ADVANCED_WITH_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
  http: new Set(['path', 'form_data', 'query', 'fetcher']),
  'kibana.request': new Set([
    'query',
    'form_data',
    'fetcher',
    'use_server_info',
    'use_localhost',
    'debug',
  ]),
  'elasticsearch.request': new Set(['params', 'headers']),
};

/**
 * For dense Elasticsearch APIs: keys NOT listed here are treated as advanced.
 * TODO(catalog): replace with per-field meta.advanced on overrides.
 */
const PRIMARY_WITH_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
  'elasticsearch.search': new Set([
    'index',
    'query',
    'size',
    'from',
    'sort',
    'aggs',
    'aggregations',
    '_source',
  ]),
  'elasticsearch.index': new Set(['index', 'id', 'document']),
  'elasticsearch.bulk': new Set(['operations', 'index']),
  'elasticsearch.update': new Set(['index', 'id', 'doc', 'script']),
  'elasticsearch.esql.query': new Set(['query']),
  'elasticsearch.indices.create': new Set(['index', 'body', 'mappings', 'settings']),
  'elasticsearch.indices.delete': new Set(['index']),
  'elasticsearch.indices.exists': new Set(['index']),
};

/**
 * Returns `true` (Advanced), `false` (promote to Configuration), or `undefined`
 * (fall back to requiredness).
 */
const resolveAdvancedHint = (
  stepType: string,
  key: string,
  schema: z.ZodType
): boolean | undefined => {
  const meta = readFieldMeta(schema);
  if (meta?.advanced === true) return true;
  if (meta?.advanced === false) return false;
  const curated = ADVANCED_WITH_KEYS[stepType];
  if (curated) return curated.has(key);
  const primary = PRIMARY_WITH_KEYS[stepType];
  if (primary) return primary.has(key) ? false : true;
  // Uncurated action — placement follows requiredness until fields are hinted.
  return undefined;
};

const getDefault = (schema: z.ZodType): unknown => {
  let current = schema;
  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodDefault ||
    current instanceof z.ZodNullable
  ) {
    if (current instanceof z.ZodDefault) {
      const def = (current as unknown as { def: { defaultValue: unknown } }).def.defaultValue;
      return typeof def === 'function' ? (def as () => unknown)() : def;
    }
    current = current.unwrap() as z.ZodType;
  }
  return undefined;
};

/** True for arrays of nested steps (`steps`, `else`, `cases[].steps`…) — edited on the canvas, not in the form. */
const isNestedStepsSchema = (schema: z.ZodType): boolean => {
  const inner = unwrapSchema(schema);
  if (!(inner instanceof z.ZodArray)) return false;
  const element = unwrapSchema(inner.element as z.ZodType);
  if (element instanceof z.ZodObject) {
    const shape = element.shape as Record<string, unknown>;
    return 'name' in shape && 'type' in shape;
  }
  // Recursive step unions are lazily defined; treat any array of unions as structural.
  return element instanceof z.ZodUnion || element instanceof z.ZodDiscriminatedUnion;
};

const isNeverSchema = (schema: z.ZodType): boolean => unwrapSchema(schema) instanceof z.ZodNever;

const resolveKind = (
  key: string,
  schema: z.ZodType
): Pick<StepFormField, 'kind' | 'language' | 'options'> => {
  const inner = unwrapSchema(schema);
  const namedLanguage = CODE_KEY_LANGUAGE[key];
  if (namedLanguage) return { kind: 'code', language: namedLanguage };

  if (inner instanceof z.ZodEnum) {
    return { kind: 'select', options: inner.options.map(String) };
  }
  if (inner instanceof z.ZodLiteral) {
    return { kind: 'select', options: [String(inner.value)] };
  }
  if (inner instanceof z.ZodBoolean) return { kind: 'boolean' };
  if (inner instanceof z.ZodNumber) return { kind: 'number' };
  if (inner instanceof z.ZodString) return { kind: 'text' };
  if (inner instanceof z.ZodUnion) {
    const members = (inner.options as z.ZodType[]).map(unwrapSchema);
    if (members.every((m) => m instanceof z.ZodString || m instanceof z.ZodLiteral)) {
      return { kind: 'text' };
    }
  }
  // Objects, arrays, records and mixed unions are edited as JSON.
  return { kind: 'code', language: 'json' };
};

const describe = (schema: z.ZodType): string | undefined => {
  const own = (schema as { description?: unknown }).description;
  if (typeof own === 'string' && own.length > 0) return own;
  const inner = (unwrapSchema(schema) as { description?: unknown }).description;
  return typeof inner === 'string' && inner.length > 0 ? inner : undefined;
};

const fieldsFromObject = (
  stepType: string,
  schema: z.ZodType | undefined,
  basePath: readonly string[]
) => {
  if (!schema) return [] as StepFormField[];
  const inner = unwrapSchema(schema);
  if (!(inner instanceof z.ZodObject)) return [] as StepFormField[];
  return Object.entries(inner.shape as Record<string, z.ZodType>)
    .filter(
      ([key, fieldSchema]) =>
        !HIDDEN_KEYS.has(key) && !isNestedStepsSchema(fieldSchema) && !isNeverSchema(fieldSchema)
    )
    .map(([key, fieldSchema]): StepFormField => {
      const { kind, language, options } = resolveKind(key, fieldSchema);
      const advanced = resolveAdvancedHint(stepType, key, fieldSchema);
      return {
        key,
        path: [...basePath, key],
        label: resolveFieldLabel(key, fieldSchema),
        description: describe(fieldSchema),
        required: isRequired(fieldSchema),
        ...(advanced !== undefined ? { advanced } : {}),
        kind,
        language,
        options,
        defaultValue: getDefault(fieldSchema),
      };
    });
};

/**
 * Builds the configuration form for a step type from the same schemas that
 * power the Actions menu: built-in step definitions (`inputSchema` → `with`,
 * `configSchema` → root keys) or a connector contract (`paramsSchema` → `with`,
 * plus `connector-id` when the contract requires one).
 */
export const getStepFormSchema = (
  stepType: string,
  connectors: readonly ConnectorContractUnion[]
): StepFormSchema | undefined => {
  const builtIn = getBuiltInStepDefinition(stepType);
  if (builtIn) {
    return {
      stepType,
      fields: [
        ...fieldsFromObject(stepType, builtIn.configSchema, []),
        ...fieldsFromObject(stepType, builtIn.inputSchema, ['with']),
      ],
    };
  }

  const connector = connectors.find((c) => c.type === stepType);
  if (!connector) return undefined;

  const fields: StepFormField[] = [];
  if (connector.hasConnectorId) {
    fields.push({
      key: 'connector-id',
      path: ['connector-id'],
      label: prettifyFieldKey('connector-id'),
      required: connector.hasConnectorId === 'required',
      kind: 'text',
    });
  }
  fields.push(...fieldsFromObject(stepType, connector.paramsSchema, ['with']));
  return { stepType, fields };
};

const readPath = (step: Record<string, unknown>, path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (acc, key) =>
      acc !== null && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
    step
  );

export const isEmptyFieldValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0);

/** Detects an unclosed `{{ … }}` Liquid/Mustache-style expression in a string. */
export const findUnclosedTemplateExpression = (value: string): boolean => {
  let index = 0;
  while (index < value.length) {
    const open = value.indexOf('{{', index);
    if (open === -1) return false;
    const close = value.indexOf('}}', open + 2);
    if (close === -1) return true;
    index = close + 2;
  }
  return false;
};

/**
 * Advisory field validation for the config panel. Returns a specific message, or
 * undefined when the value is acceptable. Empty optionals are always OK.
 */
export const validateStepField = (
  field: StepFormField,
  value: unknown
): string | undefined => {
  if (isEmptyFieldValue(value)) {
    if (!field.required) return undefined;
    return i18n.translate('workflows.stepConfigPanel.validation.required', {
      defaultMessage: '{label} is required',
      values: { label: field.label },
    });
  }

  if (field.kind === 'number') {
    const numeric =
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (typeof value === 'number' && Number.isNaN(value)) {
      return i18n.translate('workflows.stepConfigPanel.validation.mustBeNumber', {
        defaultMessage: 'Must be a number',
      });
    }
    if (typeof value === 'string' && value.trim() !== '' && Number.isNaN(numeric)) {
      return i18n.translate('workflows.stepConfigPanel.validation.mustBeNumber', {
        defaultMessage: 'Must be a number',
      });
    }
  }

  if (field.kind === 'select' && field.options && field.options.length > 0) {
    const allowed = field.options.map(String);
    if (!allowed.includes(String(value))) {
      return i18n.translate('workflows.stepConfigPanel.validation.mustBeOneOf', {
        defaultMessage: 'Must be one of: {options}',
        values: { options: allowed.join(', ') },
      });
    }
  }

  if (typeof value === 'string' && findUnclosedTemplateExpression(value)) {
    return i18n.translate('workflows.stepConfigPanel.validation.unclosedTemplate', {
      defaultMessage: 'Unclosed {open} expression',
      values: { open: '{{' },
    });
  }

  if (field.kind === 'boolean' && typeof value !== 'boolean') {
    // TODO: surface schema-specific boolean messages when a zod issue code is available
    return i18n.translate('workflows.stepConfigPanel.validation.invalidValue', {
      defaultMessage: 'Invalid value',
    });
  }

  // TODO: pattern / format messages when StepFormField carries schema constraints

  return undefined;
};

/** Required schema fields (plus `name`) that are currently empty. */
export const getMissingRequiredFields = (
  step: Record<string, unknown>,
  connectors: readonly ConnectorContractUnion[]
): readonly StepFormField[] => {
  const type = step.type;
  if (typeof type !== 'string') return [];
  const schema = getStepFormSchema(type, connectors);
  const nameField: StepFormField = {
    key: 'name',
    path: ['name'],
    label: prettifyFieldKey('name'),
    required: true,
    kind: 'text',
  };
  const fields = [nameField, ...(schema?.fields ?? [])];
  return fields.filter((f) => f.required && isEmptyFieldValue(readPath(step, f.path)));
};

/** A step is incomplete when any schema-required field (or name) is empty. */
export const isStepIncomplete = (
  step: Record<string, unknown>,
  connectors: readonly ConnectorContractUnion[]
): boolean => getMissingRequiredFields(step, connectors).length > 0;

/** Whether the form can edit `value` with the control implied by `field.kind`. */
export const isFieldValueRepresentable = (field: StepFormField, value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  switch (field.kind) {
    case 'code':
      return true;
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number' || typeof value === 'string';
    case 'select':
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    case 'text':
    default:
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }
};

const placeholderFor = (field: StepFormField): unknown => {
  if (field.defaultValue !== undefined) return field.defaultValue;
  switch (field.kind) {
    case 'boolean':
      return false;
    case 'number':
      return 0;
    case 'select':
      return field.options?.[0] ?? '';
    case 'code':
      return field.language === 'json' ? {} : '';
    case 'text':
    default:
      return '';
  }
};

/**
 * Default step object for a type: unique name, type, and every required field
 * pre-filled with its schema default (or an empty placeholder).
 */
export const buildDefaultStep = (
  stepType: string,
  name: string,
  connectors: readonly ConnectorContractUnion[]
): Record<string, unknown> => {
  const step: Record<string, unknown> = { name, type: stepType };
  const schema = getStepFormSchema(stepType, connectors);
  if (!schema) return step;
  schema.fields
    .filter((field) => field.required || field.defaultValue !== undefined)
    .forEach((field) => setPath(step, field.path, placeholderFor(field)));
  return step;
};

export const setPath = (
  target: Record<string, unknown>,
  path: readonly string[],
  value: unknown
): void => {
  let cursor = target;
  path.slice(0, -1).forEach((key) => {
    const next = cursor[key];
    if (next === null || typeof next !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  });
  cursor[path[path.length - 1]] = value;
};
