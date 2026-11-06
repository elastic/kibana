/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VARIABLE_VALUE_REGEX, DYNAMIC_VALUE_REGEX, LIQUID_TAG_VALUE_REGEX } from '../regex';

/**
 * A JSON value. JSON Schema documents are traversed structurally, so we model
 * them as plain JSON rather than importing a validator-specific type.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * Name of the shared definition holding the template-string alternatives. Every
 * templated position references this one definition (via `$ref`) instead of
 * repeating the branches, keeping the produced schema small.
 */
export const TEMPLATE_VALUE_DEF_NAME = '__workflowTemplateValue';

/** Types that denote a non-string typed position. */
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

const isObject = (value: JsonValue | undefined): value is JsonObject =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);

/**
 * JSON Schema `pattern` values are ECMA-262 regexes, and many validators (ajv
 * with `unicodeRegExp: true`, monaco-yaml) compile them with the unicode (`u`)
 * flag, under which identity escapes of non-syntax characters (e.g. `\%`) are a
 * SyntaxError. `@kbn/workflows-yaml` builds its regexes without the `u` flag, so
 * a source may contain `\%`. `\%` and `%` match identically, so we drop the
 * redundant backslash to keep the emitted pattern portable while preserving the
 * exact matching semantics.
 */
export const toUnicodeSafePattern = (source: string): string => source.replace(/\\%/g, '%');

/**
 * Anchor a pattern so it matches a value *as a whole*. JSON Schema `pattern` is
 * an unanchored (substring) match, so an un-anchored source would accept
 * template noise embedded in an otherwise concrete value (e.g. `5 {{ x }} junk`
 * in a `number` position). Strips an existing leading `^` / trailing `$` first
 * so an already-anchored source is not double-anchored.
 */
export const anchorWholeValue = (source: string): string => {
  const withoutStart = source.startsWith('^') ? source.slice(1) : source;
  const withoutEnd =
    withoutStart.endsWith('$') && !withoutStart.endsWith('\\$')
      ? withoutStart.slice(0, -1)
      : withoutStart;
  return `^(?:${withoutEnd})$`;
};

/**
 * Build a whole-value string alternative from a regex source: the source is made
 * unicode-safe and anchored so it accepts the value only when it is the template
 * as a whole. Exported so callers (e.g. the schema CLI) can contribute extra
 * whole-value alternatives such as install placeholders while staying consistent
 * with the built-in liquid alternatives.
 */
export const wholeValueStringAlternative = (regexSource: string): JsonObject => ({
  type: 'string',
  pattern: anchorWholeValue(toUnicodeSafePattern(regexSource)),
});

/** Build an unanchored (substring) string alternative from a regex source. */
const substringStringAlternative = (regexSource: string): JsonObject => ({
  type: 'string',
  pattern: toUnicodeSafePattern(regexSource),
});

/**
 * The built-in LiquidJS template alternatives, mirroring the runtime suppression
 * predicates in `parseWorkflowYamlToJSON` (`isVariableValue` / `isDynamicValue` /
 * `isLiquidTagValue`) exactly:
 *
 *  - `{{ ... }}` / `${{ ... }}` are accepted only as the **whole value**
 *    (anchored), matching the anchored `VARIABLE_VALUE_REGEX` / `DYNAMIC_VALUE_REGEX`.
 *  - `{% ... %}` is accepted as an **unanchored substring**, matching
 *    `LIQUID_TAG_VALUE_REGEX` (which the runtime tests without anchoring), so a
 *    value like `prefix {% x %} suffix` is tolerated just as it is at runtime.
 */
const liquidAlternatives = (): JsonObject[] => [
  wholeValueStringAlternative(VARIABLE_VALUE_REGEX.source),
  wholeValueStringAlternative(DYNAMIC_VALUE_REGEX.source),
  substringStringAlternative(LIQUID_TAG_VALUE_REGEX.source),
];

const hasStringConstraint = (node: JsonObject): boolean =>
  node.pattern !== undefined ||
  node.format !== undefined ||
  node.minLength !== undefined ||
  node.maxLength !== undefined;

/**
 * Whether a node could reject a bare template string and therefore needs the
 * template alternatives woven in. Full faithfulness with the runtime, which
 * suppresses *any* schema error at a template-valued path:
 *
 *  - `enum` / `const` positions reject anything outside the enumerated set → wrap.
 *  - Non-string typed positions (number/integer/boolean/array/object/null, or a
 *    union of only those) reject a string → wrap.
 *  - A `string` position that carries constraints (`pattern`/`format`/`minLength`/
 *    `maxLength`) rejects a template that does not satisfy them → wrap.
 *
 * Left untouched (they already accept an arbitrary template string):
 *  - an unconstrained `type: 'string'` (or a union that includes `string` with no
 *    string constraints), and
 *  - a fully-open node with no `type`/`enum`/`const`.
 */
const shouldWrap = (node: JsonObject): boolean => {
  if (Array.isArray(node.enum) || 'const' in node) {
    return true;
  }
  const type = node.type;
  if (type === undefined) {
    return false;
  }
  const types = Array.isArray(type) ? type : [type];
  if (types.length === 0) {
    return false;
  }
  if (types.includes('string')) {
    return hasStringConstraint(node);
  }
  return true;
};

interface TransformContext {
  /** JSON pointer to the shared template-value definition. */
  refPointer: string;
  /** Set once at least one position has been wrapped, so the def is only injected when used. */
  used: boolean;
}

const transformChild = (key: string, value: JsonValue, ctx: TransformContext): JsonValue => {
  if (SCHEMA_MAP_KEYS.has(key) && isObject(value)) {
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
    if (isObject(value)) {
      return transformNode(value, ctx, false);
    }
    return cloneJson(value);
  }

  if (key === 'dependencies' && isObject(value)) {
    // Each entry is either a subschema (object) or a list of property names (array).
    const out: JsonObject = {};
    for (const [name, child] of Object.entries(value)) {
      out[name] = isObject(child) ? transformNode(child, ctx, false) : cloneJson(child);
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
  if (!isObject(node)) {
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

/** Prefer an existing definitions map key; otherwise default to draft-7 `definitions`. */
const resolveDefinitionsKey = (schema: JsonObject): string => {
  if (schema.$defs !== undefined && schema.definitions === undefined) {
    return '$defs';
  }
  return 'definitions';
};

export interface BuildTemplateTolerantJsonSchemaOptions {
  /**
   * Extra whole-value string alternatives to add to the shared template-value
   * definition (in addition to the built-in liquid alternatives). Regex-agnostic:
   * callers supply ready-made `{ type: 'string', pattern }` objects, e.g. via
   * `wholeValueStringAlternative(source)`.
   */
  extraAlternatives?: JsonObject[];
}

/**
 * Return a copy of `schema` with template tolerance woven into every typed value
 * position that would otherwise reject a bare template string. The alternatives
 * are declared once in a shared `#/<defs>/__workflowTemplateValue` definition and
 * referenced with a single `$ref` at each wrapped position. The input is never
 * mutated; the root document is never wrapped.
 */
export const buildTemplateTolerantJsonSchema = (
  schema: JsonObject,
  options: BuildTemplateTolerantJsonSchemaOptions = {}
): JsonObject => {
  const { extraAlternatives = [] } = options;
  const defsKey = resolveDefinitionsKey(schema);
  const ctx: TransformContext = {
    refPointer: `#/${defsKey}/${TEMPLATE_VALUE_DEF_NAME}`,
    used: false,
  };

  const transformed = transformNode(schema, ctx, true) as JsonObject;

  if (ctx.used) {
    const existing = transformed[defsKey];
    const defs: JsonObject = isObject(existing) ? existing : {};
    defs[TEMPLATE_VALUE_DEF_NAME] = {
      anyOf: [...liquidAlternatives(), ...extraAlternatives],
    };
    transformed[defsKey] = defs;
  }

  return transformed;
};
