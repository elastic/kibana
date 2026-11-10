/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  DYNAMIC_TIMEOUT_TEMPLATE_MAX_LENGTH,
  getBuiltInStepDefinition,
  getStepDeprecationInfo,
  LoopStepPropsSchema,
  resolveKibanaStepTypeAlias,
} from '@kbn/workflows';
import type { ConnectorContractUnion } from '@kbn/workflows';
import { isValidDuration } from '@kbn/workflows/common/utils/duration/duration';
import { unwrapSchema } from '@kbn/workflows/common/utils/zod';
import { isReferenceValue, parseTemplateString } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import { inferVariant } from './form_variants';
import { prettifyCatalogKey } from '../../../shared/utils/catalog_display_name';

/**
 * How a field renders in the step configuration form. `code` fields get a
 * Monaco editor in `language`; everything else is a plain EUI control.
 */
export type StepFieldKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'code'
  | 'key-value'
  | 'list'
  | 'variants'
  | 'switch-cases'
  | 'parallel-branches';
/**
 * `json-liquid` is JSON text that may hold Liquid (`{{ }}` / `{% %}`): it is stored as a string,
 * never parsed into an object, because it is only valid JSON once the engine has rendered it.
 */
export type StepFieldLanguage = 'json' | 'kuery' | 'plaintext' | 'esql' | 'json-liquid';

/**
 * One way a value can be written, for a field whose schema is a union of scalars and objects
 * (`number | { limit, on-limit }`, or a body that is "by IDs" or "by query").
 */
export interface FormVariant {
  readonly id: string;
  readonly label: string;
  readonly kind: 'object' | 'scalar';
  /** Validates a stored value; used to tell which variant a value is. */
  readonly schema: z.ZodType;
  /** An object variant's keys (with their real paths), or the one control of a scalar variant. */
  readonly fields: readonly StepFormField[];
}

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
  /** `list` fields: true when one value alone is valid too (`string | string[]`). */
  readonly acceptsSingle?: boolean;
  /**
   * The field usually holds a reference to earlier data, so it opens on Data when empty:
   * `list` fields whose items aren't typed text, or any field whose schema says
   * `.meta({ preferData: true })`.
   */
  readonly preferData?: boolean;
  /** `variants` fields: the ways the value can be written. */
  readonly variants?: readonly FormVariant[];
  /**
   * `false` when the engine reads the value exactly as typed (e.g. a loop cap), so the form
   * must not offer references for it. Declared with `.meta({ templatable: false })`.
   */
  readonly templatable?: false;
  /**
   * A reference picked into an empty field is written as a value (`${{ }}`): the engine
   * evaluates a whole `${{ }}` condition to a boolean. Set for the condition of `if` and
   * `while`; once the field holds KQL a pick stays the safe text form (`{{ }}`).
   */
  readonly valueFormWhenWhole?: true;
  /** Clearing the field removes its key, instead of keeping an empty string (a step-level `if`). */
  readonly deleteWhenEmpty?: true;
  /** A text field that holds a duration (`30s`, `1h30m`), or a `{{ }}` template where it is templatable. */
  readonly format?: 'duration';
}

export interface StepFormSchema {
  readonly stepType: string;
  readonly fields: readonly StepFormField[];
  /** The step-level `if`; absent for a step whose own config rules it out (the `if` step). */
  readonly condition?: StepFormField;
  /** The step-level `timeout`; absent for a step that takes none. */
  readonly timeout?: StepFormField;
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

/**
 * When a CODE_KEY would map a *string* schema to JSON (e.g. ES|QL `query`),
 * prefer this language instead so the editor stores plaintext / Liquid.
 */
const STRING_CODE_LANGUAGE_BY_STEP: Readonly<
  Record<string, Readonly<Record<string, StepFieldLanguage>>>
> = {
  'elasticsearch.esql.query': { query: 'esql' },
};

/**
 * Transport-only params that would only add noise to the form. They are query parameters of the
 * Elasticsearch / Kibana APIs, so they only apply under `with`: a step's own root config may
 * legitimately use the same name (`data.parseJson`'s `source`).
 */
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

const isStringLikeSchema = (schema: z.ZodType): boolean => {
  const inner = unwrapSchema(schema);
  if (inner instanceof z.ZodString) return true;
  if (inner instanceof z.ZodUnion) {
    const members = (inner.options as z.ZodType[]).map(unwrapSchema);
    return members.every((m) => m instanceof z.ZodString || m instanceof z.ZodLiteral);
  }
  return false;
};

/** A map's value type is a single scalar, so each entry fits one text cell (e.g. HTTP headers). */
const isScalarValueSchema = (schema: z.ZodType): boolean => {
  const inner = unwrapSchema(schema);
  if (inner instanceof z.ZodUnion) {
    return (inner.options as z.ZodType[]).every(isScalarValueSchema);
  }
  return (
    inner instanceof z.ZodString ||
    inner instanceof z.ZodNumber ||
    inner instanceof z.ZodBoolean ||
    inner instanceof z.ZodEnum ||
    inner instanceof z.ZodLiteral
  );
};

const isTextItemSchema = (schema: z.ZodType): boolean => {
  const inner = unwrapSchema(schema);
  return (
    inner instanceof z.ZodString || inner instanceof z.ZodEnum || inner instanceof z.ZodLiteral
  );
};

const textItemOptions = (schema: z.ZodType): readonly string[] | undefined => {
  const inner = unwrapSchema(schema);
  if (inner instanceof z.ZodEnum) return inner.options.map(String);
  if (inner instanceof z.ZodLiteral) return [String(inner.value)];
  return undefined;
};

/**
 * A list of text values, edited as tags: `string[]`, or `string | string[]` where one value
 * alone is valid too. `string | unknown[]` (`foreach`) also counts, but its items aren't typed
 * text, so the list usually comes from earlier data.
 */
const resolveListShape = (
  inner: z.ZodType
): Pick<StepFormField, 'options' | 'acceptsSingle' | 'preferData'> | undefined => {
  if (inner instanceof z.ZodArray) {
    const element = inner.element as z.ZodType;
    if (!isTextItemSchema(element)) return undefined;
    return { acceptsSingle: false, options: textItemOptions(element) };
  }
  if (inner instanceof z.ZodUnion) {
    const members = (inner.options as z.ZodType[]).map(unwrapSchema);
    if (members.length !== 2) return undefined;
    const [array] = members.filter((member) => member instanceof z.ZodArray) as z.ZodArray[];
    const hasString = members.some((member) => member instanceof z.ZodString);
    if (!array || !hasString) return undefined;
    const element = unwrapSchema(array.element as z.ZodType);
    if (isTextItemSchema(element)) {
      return { acceptsSingle: true, options: textItemOptions(element) };
    }
    if (element instanceof z.ZodUnknown || element instanceof z.ZodAny) {
      return { acceptsSingle: true, preferData: true };
    }
  }
  return undefined;
};

const resolveKind = (
  stepType: string,
  key: string,
  schema: z.ZodType
): Pick<StepFormField, 'kind' | 'language' | 'options' | 'acceptsSingle' | 'preferData'> => {
  if (stepType === 'switch' && key === 'cases') {
    return { kind: 'switch-cases' };
  }
  if (stepType === 'parallel' && key === 'branches') {
    return { kind: 'parallel-branches' };
  }

  const inner = unwrapSchema(schema);

  // Schema-level `.meta({ language })` annotation takes priority over name-based overrides,
  // so step types can declare their language without a hardcoded entry in this file.
  const metaLanguage = readFieldMeta(schema)?.language as StepFieldLanguage | undefined;
  if (
    metaLanguage === 'json' ||
    metaLanguage === 'kuery' ||
    metaLanguage === 'plaintext' ||
    metaLanguage === 'esql' ||
    metaLanguage === 'json-liquid'
  ) {
    return { kind: 'code', language: metaLanguage };
  }

  const namedLanguage = CODE_KEY_LANGUAGE[key];
  if (namedLanguage) {
    // String schemas (ES|QL query, plaintext body, …) must not use JSON mode —
    // JSON.parse would reject Liquid tokens and block the reference picker.
    if (isStringLikeSchema(schema)) {
      const stepOverride = STRING_CODE_LANGUAGE_BY_STEP[stepType]?.[key];
      return {
        kind: 'code',
        language: stepOverride ?? (namedLanguage === 'json' ? 'plaintext' : namedLanguage),
      };
    }
    return { kind: 'code', language: namedLanguage };
  }

  const listShape = resolveListShape(inner);
  if (listShape) return { kind: 'list', ...listShape };

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
  // Maps of scalars (headers, labels…) are edited as name/value rows, and so is a map whose schema
  // opts in with `.meta({ keyValue: true })` (its non-text values stay JSON cells). Maps of
  // anything else are arbitrary documents and stay JSON, as do objects, arrays and mixed unions.
  if (
    inner instanceof z.ZodRecord &&
    (isScalarValueSchema(inner.valueType as z.ZodType) || readFieldMeta(schema)?.keyValue === true)
  ) {
    return { kind: 'key-value' };
  }
  return { kind: 'code', language: 'json' };
};

const describe = (schema: z.ZodType): string | undefined => {
  const own = (schema as { description?: unknown }).description;
  if (typeof own === 'string' && own.length > 0) return own;
  const inner = (unwrapSchema(schema) as { description?: unknown }).description;
  return typeof inner === 'string' && inner.length > 0 ? inner : undefined;
};

type ScalarClass = 'number' | 'string' | 'boolean';

const scalarClassOf = (schema: z.ZodType): ScalarClass | undefined => {
  if (schema instanceof z.ZodNumber) return 'number';
  if (schema instanceof z.ZodBoolean) return 'boolean';
  if (schema instanceof z.ZodString || schema instanceof z.ZodEnum) return 'string';
  if (schema instanceof z.ZodLiteral)
    return typeof schema.value === 'string' ? 'string' : undefined;
  return undefined;
};

/**
 * The leaves of a (possibly nested) union, or undefined when any of them is neither a scalar nor
 * an object. `object | null`, arrays, maps and `unknown` are not a choice of how to write a value.
 */
const collectVariantMembers = (schema: z.ZodType): z.ZodType[] | undefined => {
  const inner = unwrapSchema(schema);
  if (inner instanceof z.ZodUnion) {
    const leaves: z.ZodType[] = [];
    for (const member of inner.options as z.ZodType[]) {
      const found = collectVariantMembers(member);
      if (!found) return undefined;
      leaves.push(...found);
    }
    return leaves;
  }
  return inner instanceof z.ZodObject || scalarClassOf(inner) ? [inner] : undefined;
};

const requiredKeysOf = (schema: z.ZodObject): string[] =>
  Object.entries(schema.shape as Record<string, z.ZodType>)
    .filter(([, member]) => isRequired(member))
    .map(([key]) => key);

/** Two members that differ only in an enum's choices (`status`) become one field with both. */
const mergeFields = (a: StepFormField, b: StepFormField): StepFormField =>
  a.kind === 'select' && b.kind === 'select'
    ? { ...a, options: Array.from(new Set([...(a.options ?? []), ...(b.options ?? [])])) }
    : a;

const SCALAR_LABELS: Readonly<Record<ScalarClass, string>> = {
  number: i18n.translate('workflows.stepConfigPanel.variants.number', { defaultMessage: 'Number' }),
  string: i18n.translate('workflows.stepConfigPanel.variants.text', { defaultMessage: 'Text' }),
  boolean: i18n.translate('workflows.stepConfigPanel.variants.boolean', {
    defaultMessage: 'Yes / no',
  }),
};

/**
 * The variants of a union field, or undefined when it isn't one. Object members that require the
 * same keys are one variant (their fields combined), so "close by IDs" and "set status by IDs"
 * read as the single choice "by IDs".
 */
const buildVariants = (
  stepType: string,
  key: string,
  schema: z.ZodType,
  path: readonly string[],
  required: boolean
): FormVariant[] | undefined => {
  const members = collectVariantMembers(schema);
  if (!members || !members.some((member) => member instanceof z.ZodObject)) return undefined;

  const groups = new Map<string, z.ZodType[]>();
  members.forEach((member) => {
    const signature =
      member instanceof z.ZodObject
        ? `object:${requiredKeysOf(member).sort().join(',')}`
        : `scalar:${scalarClassOf(member)}`;
    groups.set(signature, [...(groups.get(signature) ?? []), member]);
  });
  if (groups.size < 2) return undefined;

  const grouped = Array.from(groups.values());
  const requiredOfGroup = (group: z.ZodType[]): string[] =>
    group[0] instanceof z.ZodObject ? requiredKeysOf(group[0]) : [];
  const objectGroups = grouped.filter((group) => group[0] instanceof z.ZodObject);

  return grouped.map((group, index): FormVariant => {
    const [first] = group;
    const meta = readFieldMeta(first);
    const title = typeof meta?.title === 'string' && meta.title.trim() ? meta.title : undefined;
    const variantSchema =
      group.length === 1 ? first : z.union(group as [z.ZodType, z.ZodType, ...z.ZodType[]]);

    if (first instanceof z.ZodObject) {
      const merged = new Map<string, StepFormField>();
      group.forEach((member) =>
        fieldsFromObject(stepType, member, path, false).forEach((field) => {
          const existing = merged.get(field.key);
          merged.set(field.key, existing ? mergeFields(existing, field) : field);
        })
      );
      const mine = requiredOfGroup(group);
      const distinguishing = mine.filter((requiredKey) =>
        objectGroups.some(
          (other) => other !== group && !requiredOfGroup(other).includes(requiredKey)
        )
      );
      const keys = distinguishing.length > 0 ? distinguishing : mine;
      return {
        id: `variant-${index}`,
        label: title ?? keys.map(prettifyFieldKey).join(' + '),
        kind: 'object',
        schema: variantSchema,
        fields: Array.from(merged.values()),
      };
    }

    const scalarClass = scalarClassOf(first) as ScalarClass;
    const { kind, options } = resolveKind(stepType, key, first);
    return {
      id: `variant-${index}`,
      label: title ?? SCALAR_LABELS[scalarClass],
      kind: 'scalar',
      schema: variantSchema,
      // The group already carries the field's label; this control is just its value.
      fields: [
        {
          // Only the path addresses it; a `value` key keeps the label from echoing the real one.
          key: 'value',
          path,
          label: i18n.translate('workflows.stepConfigPanel.variants.valueLabel', {
            defaultMessage: 'Value',
          }),
          required,
          kind,
          options,
        },
      ],
    };
  });
};

/**
 * Steps whose root `condition` is evaluated once, as a whole: `${{ }}` gives a boolean. Not
 * `data.filter` / `data.find`, whose condition is KQL run per item, where a whole `${{ }}` would
 * be evaluated once without `item`.
 */
const VALUE_FORM_CONDITION_STEP_TYPES: ReadonlySet<string> = new Set(['if', 'while']);

const fieldsFromObject = (
  stepType: string,
  schema: z.ZodType | undefined,
  basePath: readonly string[],
  allowVariants = true
) => {
  if (!schema) return [] as StepFormField[];
  const inner = unwrapSchema(schema);
  // A step whose whole `with` is a choice between shapes (`kibana.SetAlertsStatus`): one field.
  if (
    allowVariants &&
    inner instanceof z.ZodUnion &&
    basePath.length === 1 &&
    basePath[0] === 'with'
  ) {
    const label =
      (readFieldMeta(schema)?.title as string | undefined) ??
      i18n.translate('workflows.stepConfigPanel.recordWithLabel', { defaultMessage: 'Fields' });
    const required = isRequired(schema);
    const variants = buildVariants(stepType, 'with', schema, basePath, required);
    if (variants) {
      const withField: StepFormField = {
        key: 'with',
        path: basePath,
        label,
        description: describe(schema),
        required,
        kind: 'variants',
        variants,
      };
      return [withField];
    }
  }
  // A step whose whole `with` is a map of names to values (`data.set`): one field for the map.
  if (inner instanceof z.ZodRecord && basePath.length === 1 && basePath[0] === 'with') {
    const withField: StepFormField = {
      key: 'with',
      path: basePath,
      label:
        (readFieldMeta(schema)?.title as string | undefined) ??
        i18n.translate('workflows.stepConfigPanel.recordWithLabel', { defaultMessage: 'Fields' }),
      description: describe(schema),
      required: isRequired(schema),
      kind: 'key-value',
    };
    return [withField];
  }
  if (!(inner instanceof z.ZodObject)) return [] as StepFormField[];
  // Nested-steps arrays (`steps`, `else`, `cases[].steps`…) are a root-level
  // (`configSchema`) concept only — they're never under `with`. Scoping the
  // check to root keys avoids misreading an array-of-union/array-of-object
  // `with.*` field (e.g. `elasticsearch.bulk`'s `operations`) as structural.
  const isRootLevel = basePath.length === 0;
  const isWithLevel = basePath[0] === 'with';
  return Object.entries(inner.shape as Record<string, z.ZodType>)
    .filter(
      ([key, fieldSchema]) =>
        !(isWithLevel && HIDDEN_KEYS.has(key)) &&
        !(isRootLevel && isNestedStepsSchema(fieldSchema)) &&
        !isNeverSchema(fieldSchema)
    )
    .map(([key, fieldSchema]): StepFormField => {
      const path = [...basePath, key];
      const label = resolveFieldLabel(key, fieldSchema);
      const required = isRequired(fieldSchema);
      const fixedOnly = readFieldMeta(fieldSchema)?.templatable === false;
      // A union of scalars and objects is a choice of how to write the value, unless a code
      // language (by key name or schema meta) already claims the field.
      const claimsCode =
        CODE_KEY_LANGUAGE[key] !== undefined || readFieldMeta(fieldSchema)?.language !== undefined;
      const built =
        allowVariants && !claimsCode
          ? buildVariants(stepType, key, fieldSchema, path, required)
          : undefined;
      // A fixed-only field's sub-fields are fixed-only too.
      const variants = fixedOnly
        ? built?.map((variant) => ({
            ...variant,
            fields: variant.fields.map((field) => ({ ...field, templatable: false as const })),
          }))
        : built;
      const { kind, language, options, acceptsSingle, preferData } = variants
        ? {
            kind: 'variants' as const,
            language: undefined,
            options: undefined,
            acceptsSingle: undefined,
            preferData: undefined,
          }
        : resolveKind(stepType, key, fieldSchema);
      const advanced = resolveAdvancedHint(stepType, key, fieldSchema);
      // A schema can also say a field usually holds a reference: `.meta({ preferData: true })`.
      const startsOnData = preferData || readFieldMeta(fieldSchema)?.preferData === true;
      return {
        key,
        path,
        label,
        description: describe(fieldSchema),
        required,
        ...(variants ? { variants } : {}),
        ...(advanced !== undefined ? { advanced } : {}),
        kind,
        language,
        options,
        ...(acceptsSingle !== undefined ? { acceptsSingle } : {}),
        ...(startsOnData ? { preferData: true } : {}),
        defaultValue: getDefault(fieldSchema),
        ...(fixedOnly ? { templatable: false as const } : {}),
        ...((isRootLevel && key === 'condition' && VALUE_FORM_CONDITION_STEP_TYPES.has(stepType)) ||
        language === 'json-liquid'
          ? { valueFormWhenWhole: true as const }
          : {}),
      };
    });
};

/** Loop-only root keys that live on the step schema, not on its `configSchema`. */
const LOOP_STEP_TYPES: ReadonlySet<string> = new Set(['while', 'foreach']);
const LOOP_ROOT_PROPS_SCHEMA = LoopStepPropsSchema.pick({ 'max-iterations': true });

/**
 * Connector type lookup candidates for a step: exact type, Kibana OAS aliases
 * (`kibana.createCaseDefaultSpace` → `kibana.createCase`), then deprecation
 * replacements (`kibana.createCase` → `cases.createCase`).
 */
const connectorTypeCandidates = (stepType: string): readonly string[] => {
  const candidates: string[] = [stepType];
  const aliased = resolveKibanaStepTypeAlias(stepType);
  if (aliased !== stepType) candidates.push(aliased);
  for (const candidate of [...candidates]) {
    const replacement = getStepDeprecationInfo(candidate)?.replacementStepType;
    if (replacement && !candidates.includes(replacement)) candidates.push(replacement);
  }
  return candidates;
};

/**
 * The step-level `if`: a KQL condition that gates the step, which the engine runs as an `if` step
 * around it, so it is written like that step's `condition` (a whole `${{ }}` is evaluated).
 */
const STEP_CONDITION_FIELD: StepFormField = {
  key: 'if',
  path: ['if'],
  label: i18n.translate('workflows.stepConfigPanel.conditionLabel', {
    defaultMessage: 'Condition',
  }),
  description: i18n.translate('workflows.stepConfigPanel.conditionDescription', {
    defaultMessage: 'Run this step only when this condition is true.',
  }),
  required: false,
  kind: 'code',
  language: 'kuery',
  valueFormWhenWhole: true,
  deleteWhenEmpty: true,
};

/** Every step takes `if`, unless its own config declares it `never` (the `if` step gates on `condition`). */
const getStepCondition = (configSchema: z.ZodType | undefined): StepFormField | undefined => {
  const root = configSchema && unwrapSchema(configSchema);
  const shape = root instanceof z.ZodObject ? (root.shape as Record<string, z.ZodType>) : undefined;
  return shape?.if && isNeverSchema(shape.if) ? undefined : STEP_CONDITION_FIELD;
};

/**
 * Step types with no step-level `timeout`: their YAML schema does not take it, except `switch`,
 * which the schema takes but the engine never applies. Kept in step with the step schemas by a test.
 */
const STEP_TYPES_WITHOUT_TIMEOUT: ReadonlySet<string> = new Set([
  'if',
  'switch',
  'merge',
  'wait',
  'data.set',
  'loop.break',
  'loop.continue',
  'workflow.execute',
  'workflow.executeAsync',
  'workflow.fail',
  'workflow.output',
]);

/** Their YAML schema takes a literal duration; every other step also takes Liquid that renders to one. */
const STATIC_TIMEOUT_STEP_TYPES: ReadonlySet<string> = new Set(['foreach', 'while', 'parallel']);

const STEP_TIMEOUT_FIELD: StepFormField = {
  key: 'timeout',
  path: ['timeout'],
  label: i18n.translate('workflows.stepConfigPanel.timeoutLabel', { defaultMessage: 'Duration' }),
  description: i18n.translate('workflows.stepConfigPanel.timeoutDescription', {
    defaultMessage:
      'Fail the step if it runs longer than this, e.g. 30s, 5m or 1h30m. A {template} template that renders to a duration also works.',
    values: { template: '{{ }}' },
  }),
  required: false,
  kind: 'text',
  format: 'duration',
  deleteWhenEmpty: true,
};

const STATIC_STEP_TIMEOUT_FIELD: StepFormField = {
  ...STEP_TIMEOUT_FIELD,
  description: i18n.translate('workflows.stepConfigPanel.timeoutStaticDescription', {
    defaultMessage: 'Fail the step if it runs longer than this, e.g. 30s, 5m or 1h30m.',
  }),
  templatable: false,
};

const getStepTimeout = (stepType: string): StepFormField | undefined => {
  if (STEP_TYPES_WITHOUT_TIMEOUT.has(stepType)) return undefined;
  return STATIC_TIMEOUT_STEP_TYPES.has(stepType) ? STATIC_STEP_TIMEOUT_FIELD : STEP_TIMEOUT_FIELD;
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
        ...(LOOP_STEP_TYPES.has(stepType)
          ? fieldsFromObject(stepType, LOOP_ROOT_PROPS_SCHEMA, [])
          : []),
        ...fieldsFromObject(stepType, builtIn.inputSchema, ['with']),
      ],
      condition: getStepCondition(builtIn.configSchema),
      timeout: getStepTimeout(stepType),
    };
  }

  let connector: ConnectorContractUnion | undefined;
  for (const candidate of connectorTypeCandidates(stepType)) {
    connector = connectors.find((c) => c.type === candidate);
    if (connector) break;
  }
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
  // Field paths stay under the edited step type; only the schema is resolved
  // through aliases so deprecated YAML types still get a usable form.
  fields.push(...fieldsFromObject(stepType, connector.configSchema, []));
  fields.push(...fieldsFromObject(stepType, connector.paramsSchema, ['with']));
  return {
    stepType,
    fields,
    condition: getStepCondition(connector.configSchema),
    timeout: getStepTimeout(stepType),
  };
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

/** A `{{ }}` output, with the `$` of its value form (`${{ }}`) when it has one. */
const LIQUID_OUTPUT_PATTERN = /\$?\{\{[\s\S]*?\}\}/g;

/** Longer text is not checked: this runs on every render and a huge template is slow to parse. */
const MAX_VALIDATED_JSON_LIQUID_CHARS = 100_000;

/**
 * JSON text with Liquid in it: the Liquid must parse, and, unless a `{% %}` tag can reshape the
 * text, the JSON must hold once each `{{ }}` is stood in for by a value (`0` fits as a bare value
 * and inside a string alike, and a whole `${{ }}` reference is a value too).
 */
const validateJsonLiquid = (text: string): string | undefined => {
  if (text.length > MAX_VALIDATED_JSON_LIQUID_CHARS) return undefined;
  try {
    parseTemplateString(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return (
      message.replace(/, line:\d+, col:\d+/g, '') ||
      i18n.translate('workflows.stepConfigPanel.validation.invalidLiquid', {
        defaultMessage: 'Invalid Liquid syntax',
      })
    );
  }
  if (text.includes('{%')) return undefined;
  try {
    JSON.parse(text.replace(LIQUID_OUTPUT_PATTERN, '0'));
  } catch {
    return i18n.translate('workflows.stepConfigPanel.validation.mustBeJsonIgnoringVariables', {
      defaultMessage: 'Must be valid JSON (ignoring variables)',
    });
  }
  return undefined;
};

const LIQUID_TEMPLATE_PATTERN = /\{\{[\s\S]*\}\}/;

/** A duration, or (where the step takes Liquid) a `{{ }}` template that renders to one. */
const validateDuration = (text: string, templatable: boolean): string | undefined => {
  const isTemplate =
    templatable &&
    text.length <= DYNAMIC_TIMEOUT_TEMPLATE_MAX_LENGTH &&
    LIQUID_TEMPLATE_PATTERN.test(text);
  if (isTemplate || isValidDuration(text)) return undefined;
  return templatable
    ? i18n.translate('workflows.stepConfigPanel.validation.mustBeDurationOrTemplate', {
        defaultMessage: 'Must be a duration (e.g. 30s or 1h30m) or a {template} template',
        values: { template: '{{ }}' },
      })
    : i18n.translate('workflows.stepConfigPanel.validation.mustBeDuration', {
        defaultMessage: 'Must be a duration, e.g. 30s or 1h30m',
      });
};

/**
 * Advisory field validation for the config panel. Returns a specific message, or
 * undefined when the value is acceptable. Empty optionals are always OK.
 */
export const validateStepField = (field: StepFormField, value: unknown): string | undefined => {
  // A choice of shapes has no value of its own: its fields are validated one by one.
  if (field.kind === 'variants') return undefined;
  if (isEmptyFieldValue(value)) {
    if (!field.required) return undefined;
    return i18n.translate('workflows.stepConfigPanel.validation.required', {
      defaultMessage: '{label} is required',
      values: { label: field.label },
    });
  }

  // Runtime-evaluated reference — skip typed-field validation entirely.
  const isReference = isReferenceValue(value);

  if (field.kind === 'number' && !isReference) {
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

  if (field.kind === 'select' && field.options && field.options.length > 0 && !isReference) {
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

  if (field.language === 'json-liquid' && typeof value === 'string') {
    return validateJsonLiquid(value);
  }

  if (field.format === 'duration' && typeof value === 'string') {
    return validateDuration(value, field.templatable !== false);
  }

  if (field.kind === 'boolean' && typeof value !== 'boolean' && !isReference) {
    // TODO: surface schema-specific boolean messages when a zod issue code is available
    return i18n.translate('workflows.stepConfigPanel.validation.invalidValue', {
      defaultMessage: 'Invalid value',
    });
  }

  // TODO: pattern / format messages when StepFormField carries schema constraints

  return undefined;
};

const stepNameField = (): StepFormField => ({
  key: 'name',
  path: ['name'],
  label: prettifyFieldKey('name'),
  required: true,
  kind: 'text',
});

/**
 * The fields that count for a step's current value: a choice of shapes stands for the fields of
 * the shape the value is in (the first one while it is empty), and is skipped when it is optional
 * and unset.
 */
const getActiveFields = (
  fields: readonly StepFormField[],
  step: Record<string, unknown>
): StepFormField[] =>
  fields.flatMap((field) => {
    if (field.kind !== 'variants' || !field.variants) return [field];
    const value = readPath(step, field.path);
    if (!field.required && isEmptyFieldValue(value)) return [];
    return [...inferVariant(field.variants, value).fields];
  });

/** Required schema fields (plus `name`) that are currently empty. */
export const getMissingRequiredFields = (
  step: Record<string, unknown>,
  connectors: readonly ConnectorContractUnion[]
): readonly StepFormField[] => {
  const type = step.type;
  if (typeof type !== 'string') return [];
  const schema = getStepFormSchema(type, connectors);
  const fields = getActiveFields([stepNameField(), ...(schema?.fields ?? [])], step);
  return fields.filter((f) => f.required && isEmptyFieldValue(readPath(step, f.path)));
};

/** A step is incomplete when any schema-required field (or name) is empty. */
export const isStepIncomplete = (
  step: Record<string, unknown>,
  connectors: readonly ConnectorContractUnion[]
): boolean => getMissingRequiredFields(step, connectors).length > 0;

/**
 * Applied-state config warning for the canvas badge.
 * - `incomplete`: a required field (or name) is empty
 * - `misconfigured`: a populated field fails validation (type, template, etc.)
 * - `both`: both conditions apply
 */
export type StepConfigWarningReason = 'incomplete' | 'misconfigured' | 'both';

export const getStepConfigWarningReason = (
  step: Record<string, unknown>,
  connectors: readonly ConnectorContractUnion[]
): StepConfigWarningReason | undefined => {
  const type = step.type;
  if (typeof type !== 'string') return undefined;
  const schema = getStepFormSchema(type, connectors);
  const fields = getActiveFields([stepNameField(), ...(schema?.fields ?? [])], step);

  let incomplete = false;
  let misconfigured = false;
  for (const field of fields) {
    const value = readPath(step, field.path);
    if (!isFieldValueRepresentable(field, value)) continue;
    if (isEmptyFieldValue(value)) {
      if (field.required) incomplete = true;
      continue;
    }
    if (validateStepField(field, value) !== undefined) {
      misconfigured = true;
    }
  }

  if (incomplete && misconfigured) return 'both';
  if (incomplete) return 'incomplete';
  if (misconfigured) return 'misconfigured';
  return undefined;
};

/** Whether the form can edit `value` with the control implied by `field.kind`. */
export const isFieldValueRepresentable = (field: StepFormField, value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  switch (field.kind) {
    case 'code':
    case 'switch-cases':
    case 'parallel-branches':
      return true;
    case 'key-value':
      return typeof value === 'object' && !Array.isArray(value);
    case 'list':
      return typeof value === 'string' || Array.isArray(value);
    case 'variants':
      return (
        value === undefined ||
        (typeof value === 'object' && value !== null && !Array.isArray(value)) ||
        Boolean(field.variants?.some((variant) => variant.schema.safeParse(value).success))
      );
    case 'boolean':
      return typeof value === 'boolean' || typeof value === 'string';
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
      // Default to empty (not `{}`) even for JSON-shaped fields: these are
      // templatable, and a pre-filled `{}` both reads as real content in the
      // single-line display and blocks starting the value as an expression.
      // Empty is just as "missing" for required-field validation
      // (`isEmptyFieldValue`) and shows the same placeholder as any other
      // unset field.
      return '';
    case 'switch-cases':
    case 'parallel-branches':
      return [];
    case 'key-value':
      return {};
    case 'variants':
      return {};
    case 'list':
      // A single value alone is valid for `string | string[]`; keep the old empty-string start.
      return field.acceptsSingle ? '' : [];
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
