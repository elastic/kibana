/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  VARIABLE_VALUE_REGEX,
  DYNAMIC_VALUE_REGEX,
  LIQUID_TAG_VALUE_REGEX,
} from '@kbn/workflows-yaml';
import { INSTALL_PLACEHOLDER_VALUE_REGEX } from './constants';
import type { JsonObject, JsonValue } from './types';

/**
 * Types that denote a non-string typed value position. Templating is only woven
 * into these positions; `string` positions already accept a template (it is a
 * string), and their `enum`/`pattern`/`const` are intentionally left strict.
 */
const NON_STRING_TYPES: ReadonlySet<string> = new Set([
  'number',
  'integer',
  'boolean',
  'array',
  'object',
]);

/** Keys whose value is a map of name -> subschema. */
const SCHEMA_MAP_KEYS: ReadonlySet<string> = new Set([
  'properties',
  'patternProperties',
  'definitions',
  '$defs',
]);

/** Keys whose value is an array of subschemas. */
const SCHEMA_ARRAY_KEYS: ReadonlySet<string> = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);

/** Keys whose value is a single subschema (or a boolean schema). */
const SCHEMA_KEYS: ReadonlySet<string> = new Set([
  'additionalProperties',
  'additionalItems',
  'contains',
  'not',
  'if',
  'then',
  'else',
  'propertyNames',
  'unevaluatedProperties',
  'unevaluatedItems',
]);

const cloneJson = <T extends JsonValue>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Name of the shared definition holding the LiquidJS (and, in `template`,
 * install-placeholder) alternatives. Every templated position references this
 * one definition instead of repeating the branches, keeping the artifact small.
 */
export const TEMPLATE_VALUE_DEF_NAME = '__workflowTemplateValue';

/** Prefer an existing definitions map key; otherwise default to draft-7 `definitions`. */
const resolveDefinitionsKey = (schema: JsonObject): string => {
  if (schema.definitions !== undefined) {
    return 'definitions';
  }
  if (schema.$defs !== undefined) {
    return '$defs';
  }
  return 'definitions';
};

interface TransformContext {
  /** JSON pointer to the shared template-value definition. */
  refPointer: string;
  /** Set once at least one position has been wrapped, so we only inject the def when used. */
  used: boolean;
}

/**
 * JSON Schema `pattern` values are ECMA-262 regexes, and many validators
 * (ajv, monaco-yaml) compile them with the unicode (`u`) flag, under which
 * identity escapes of non-syntax characters (e.g. `\%`) are a SyntaxError.
 * `@kbn/workflows-yaml` builds its regexes without the `u` flag, so
 * `LIQUID_TAG_VALUE_REGEX.source` contains `\%`. `\%` and `%` match identically,
 * so we drop the redundant backslash to keep the emitted pattern portable while
 * preserving the exact matching semantics.
 */
const toUnicodeSafePattern = (source: string): string => source.replace(/\\%/g, '%');

/**
 * The template-string alternatives added alongside a concrete typed value.
 * Uses the regex sources exported from `@kbn/workflows-yaml` (unicode-normalized)
 * so the artifact stays faithful to Kibana's own tolerance semantics.
 */
export const templateStringAlternatives = (includeInstallPlaceholder: boolean): JsonObject[] => {
  const alternatives: JsonObject[] = [
    { type: 'string', pattern: toUnicodeSafePattern(VARIABLE_VALUE_REGEX.source) },
    { type: 'string', pattern: toUnicodeSafePattern(DYNAMIC_VALUE_REGEX.source) },
    { type: 'string', pattern: toUnicodeSafePattern(LIQUID_TAG_VALUE_REGEX.source) },
  ];
  if (includeInstallPlaceholder) {
    alternatives.push({
      type: 'string',
      pattern: toUnicodeSafePattern(INSTALL_PLACEHOLDER_VALUE_REGEX.source),
    });
  }
  return alternatives;
};

const shouldWrap = (node: JsonObject): boolean => {
  const type = node.type;
  if (type === undefined) {
    return false;
  }
  const types = Array.isArray(type) ? type : [type];
  // Wrap only when every declared type is a non-string typed position. A union
  // that already includes `string` accepts template strings as-is.
  return (
    types.length > 0 &&
    types.every((entry) => typeof entry === 'string' && NON_STRING_TYPES.has(entry))
  );
};

const transformChild = (key: string, value: JsonValue, ctx: TransformContext): JsonValue => {
  if (SCHEMA_MAP_KEYS.has(key) && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const out: JsonObject = {};
    for (const [name, child] of Object.entries(value)) {
      out[name] = transformNode(child, ctx, false);
    }
    return out;
  }

  if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(value)) {
    return value.map((child) => transformNode(child, ctx, false));
  }

  if (key === 'items') {
    // Draft-7 `items` is either a single schema or an array (tuple) of schemas.
    if (Array.isArray(value)) {
      return value.map((child) => transformNode(child, ctx, false));
    }
    if (value !== null && typeof value === 'object') {
      return transformNode(value, ctx, false);
    }
    return cloneJson(value);
  }

  if (key === 'dependencies' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    // Each entry is either a subschema (object) or a list of property names (array).
    const out: JsonObject = {};
    for (const [name, child] of Object.entries(value)) {
      out[name] =
        child !== null && typeof child === 'object' && !Array.isArray(child)
          ? transformNode(child, ctx, false)
          : cloneJson(child);
    }
    return out;
  }

  if (SCHEMA_KEYS.has(key) && value !== null && typeof value === 'object') {
    return transformNode(value, ctx, false);
  }

  // Not a schema position (e.g. `type`, `const`, `enum`, `default`, `required`,
  // `description`) - copy verbatim.
  return cloneJson(value);
};

const transformNode = (node: JsonValue, ctx: TransformContext, isRoot: boolean): JsonValue => {
  if (Array.isArray(node)) {
    return node.map((entry) => transformNode(entry, ctx, false));
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }

  const transformed: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    transformed[key] = transformChild(key, value, ctx);
  }

  if (!isRoot && shouldWrap(transformed)) {
    ctx.used = true;
    const wrapped: JsonObject = {
      // Reference the shared template-value definition instead of inlining the
      // (identical) alternatives at every position.
      anyOf: [transformed, { $ref: ctx.refPointer }],
    };
    // Preserve a hover description on the wrapper so editors keep the doc string.
    if (typeof transformed.description === 'string') {
      wrapped.description = transformed.description;
    }
    return wrapped;
  }

  return transformed;
};

const buildVariant = (schema: JsonObject, includeInstallPlaceholder: boolean): JsonObject => {
  const defsKey = resolveDefinitionsKey(schema);
  const ctx: TransformContext = {
    refPointer: `#/${defsKey}/${TEMPLATE_VALUE_DEF_NAME}`,
    used: false,
  };

  const transformed = transformNode(schema, ctx, true) as JsonObject;

  if (ctx.used) {
    const existing = transformed[defsKey];
    const defs: JsonObject =
      existing !== null && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
    defs[TEMPLATE_VALUE_DEF_NAME] = { anyOf: templateStringAlternatives(includeInstallPlaceholder) };
    transformed[defsKey] = defs;
  }

  return transformed;
};

/**
 * `strict` variant: the composed schema with LiquidJS tolerance woven into every
 * non-string typed value position (via a single shared `$ref`). The root document
 * itself is never wrapped.
 */
export const transformToStrict = (schema: JsonObject): JsonObject => buildVariant(schema, false);

/**
 * `template` variant: `strict` plus the `__install__.<name>` install-placeholder
 * alternative in the shared definition (installable library templates).
 */
export const transformToTemplate = (schema: JsonObject): JsonObject => buildVariant(schema, true);
