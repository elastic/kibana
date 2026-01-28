/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Zod v4-style toJSONSchema Polyfill for Zod v3
 *
 * Problem:
 *   As zod v3 is currently installed, we do not have access to
 *   the z.toJSONSchema function in Zod v3 (with the openapi-3
 *   target, which is a hard requirement)
 * Solution:
 *   This module polyfills zod v4's `toJSONSchema` function that allows
 *   us to use Zod v4's toJSONSchema function (we are using the
 *   implementation from zod v4.3.6)
 *
 * Notes:
 * - This polyfill is temporary. Once zod is upgraded to v4 for
 *   this project, we can remove this polyfill and use the native
 *   z.toJSONSchema function.
 *
 * Usage:
 * Instead of:
 *   import { z } from 'zod';
 *   const jsonSchema = z.toJSONSchema(schema, { target: 'openapi-3.0' });
 * Use:
 *   import { toJSONSchema } from './zod-to-json-schema-polyfill';
 *   const jsonSchema = toJSONSchema(schema, { target: 'openapi-3.0' });
 */

// =============================================================================
// JSON Schema Types
// =============================================================================

export type JSONSchemaTarget =
  | 'draft-04'
  | 'draft-07'
  | 'draft-2020-12'
  | 'openapi-3.0'
  | (string & {});

export interface JSONSchema {
  [k: string]: unknown;
  $schema?:
    | 'https://json-schema.org/draft/2020-12/schema'
    | 'http://json-schema.org/draft-07/schema#'
    | 'http://json-schema.org/draft-04/schema#';
  $id?: string;
  $ref?: string;
  $defs?: Record<string, JSONSchema>;
  definitions?: Record<string, JSONSchema>;
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'integer';
  properties?: Record<string, JSONSchema>;
  additionalProperties?: boolean | JSONSchema;
  required?: string[];
  items?: JSONSchema | JSONSchema[] | boolean;
  prefixItems?: JSONSchema[];
  additionalItems?: boolean | JSONSchema;
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  enum?: Array<string | number | boolean | null>;
  const?: string | number | boolean | null;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  multipleOf?: number;
  format?: string;
  default?: unknown;
  description?: string;
  title?: string;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  nullable?: boolean;
  examples?: unknown[];
  contentMediaType?: string;
  contentEncoding?: string;
  propertyNames?: JSONSchema;
  patternProperties?: Record<string, JSONSchema>;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface ToJSONSchemaParams {
  /**
   * The JSON Schema version to target.
   * @default "draft-2020-12"
   */
  target?: JSONSchemaTarget;

  /**
   * How to handle unrepresentable types (Date, Symbol, BigInt, etc.)
   * - "throw": Throw an error (default)
   * - "any": Convert to empty schema {}
   * @default "throw"
   */
  unrepresentable?: 'throw' | 'any';

  /**
   * Whether to extract "input" or "output" type. Relevant for transforms/defaults.
   * @default "output"
   */
  io?: 'input' | 'output';

  /**
   * How to handle cyclical schemas.
   * - "ref": Break cycles with $ref (default)
   * - "throw": Throw an error on cycles
   * @default "ref"
   */
  cycles?: 'ref' | 'throw';

  /**
   * How to handle reused schemas.
   * - "inline": Inline reused schemas (default)
   * - "ref": Extract reused schemas to $defs
   * @default "inline"
   */
  reused?: 'ref' | 'inline';

  /**
   * Custom override function to modify generated JSON Schema.
   */
  override?: (ctx: { zodSchema: any; jsonSchema: JSONSchema; path: (string | number)[] }) => void;
}

// =============================================================================
// Internal Context
// =============================================================================

interface Seen {
  schema: JSONSchema;
  def?: JSONSchema;
  defId?: string;
  count: number;
  cycle?: (string | number)[];
  isParent?: boolean;
  ref?: any;
  path?: (string | number)[];
}

interface ToJSONSchemaContext {
  target: JSONSchemaTarget;
  unrepresentable: 'throw' | 'any';
  io: 'input' | 'output';
  cycles: 'ref' | 'throw';
  reused: 'ref' | 'inline';
  override: (ctx: { zodSchema: any; jsonSchema: JSONSchema; path: (string | number)[] }) => void;
  counter: number;
  seen: Map<any, Seen>;
}

interface ProcessParams {
  schemaPath: any[];
  path: (string | number)[];
}

// =============================================================================
// Global Registry Access (for Zod v4 metadata like .describe())
// =============================================================================

/**
 * Try to access the global registry from Zod v4
 * This is where .describe() and other metadata is stored
 */
function getGlobalRegistry(): any {
  // Zod v4 stores the globalRegistry on globalThis
  const g = globalThis as any;
  return g.__zod_globalRegistry;
}

/**
 * Get metadata from the global registry for a schema
 */
function getRegistryMetadata(schema: any): Record<string, unknown> | undefined {
  // Only try to get registry metadata for Zod v4 schemas
  // that have the _zod property (required by the registry)
  if (!schema?._zod) {
    return undefined;
  }

  try {
    const registry = getGlobalRegistry();
    if (registry && typeof registry.get === 'function') {
      return registry.get(schema);
    }
  } catch {
    // Ignore errors from registry access
  }
  return undefined;
}

// =============================================================================
// Zod v3 Type Detection Helpers
// =============================================================================

/**
 * Get the Zod type name from a Zod v3 schema.
 * Zod v3 uses _def.typeName, Zod v4 uses _zod.def.type
 */
function getZodTypeName(schema: any): string | undefined {
  // Zod v4 structure
  if (schema?._zod?.def?.type) {
    return schema._zod.def.type;
  }
  // Zod v3 structure
  if (schema?._def?.typeName) {
    // Convert ZodString -> string, ZodNumber -> number, etc.
    const typeName = schema._def.typeName as string;
    return typeName.replace(/^Zod/, '').toLowerCase();
  }
  return undefined;
}

/**
 * Get the schema definition (v3's _def or v4's _zod.def)
 */
function getDef(schema: any): any {
  return schema?._zod?.def ?? schema?._def ?? {};
}

/**
 * Check if this is a Zod v4 schema
 */
function isZodV4(schema: any): boolean {
  return !!schema?._zod;
}

// =============================================================================
// Utility Functions
// =============================================================================

function getEnumValues(entries: Record<string, string | number>): (string | number)[] {
  const numericValues = Object.values(entries).filter((v) => typeof v === 'number');
  const values = Object.entries(entries)
    .filter(([k, _]) => numericValues.indexOf(+k) === -1)
    .map(([_, v]) => v);
  return values;
}

// =============================================================================
// Schema Processors
// =============================================================================

type Processor = (
  schema: any,
  ctx: ToJSONSchemaContext,
  json: JSONSchema,
  params: ProcessParams
) => void;

const stringProcessor: Processor = (schema, ctx, json, _params) => {
  json.type = 'string';
  const def = getDef(schema);

  // Handle Zod v3 checks
  if (def.checks) {
    for (const check of def.checks) {
      if (check.kind === 'min') json.minLength = check.value;
      if (check.kind === 'max') json.maxLength = check.value;
      if (check.kind === 'length') {
        json.minLength = check.value;
        json.maxLength = check.value;
      }
      if (check.kind === 'email') json.format = 'email';
      if (check.kind === 'url') json.format = 'uri';
      if (check.kind === 'uuid') json.format = 'uuid';
      if (check.kind === 'cuid') json.format = 'cuid';
      if (check.kind === 'cuid2') json.format = 'cuid2';
      if (check.kind === 'ulid') json.format = 'ulid';
      if (check.kind === 'datetime') json.format = 'date-time';
      if (check.kind === 'date') json.format = 'date';
      if (check.kind === 'time') json.format = 'time';
      if (check.kind === 'ip') json.format = check.version === 'v6' ? 'ipv6' : 'ipv4';
      if (check.kind === 'regex') json.pattern = check.regex.source;
      if (check.kind === 'startsWith') {
        json.pattern = `^${escapeRegex(check.value)}.*`;
      }
      if (check.kind === 'endsWith') {
        json.pattern = `.*${escapeRegex(check.value)}$`;
      }
      if (check.kind === 'includes') {
        json.pattern = escapeRegex(check.value);
      }
    }
  }

  // Handle Zod v4 bag
  if (schema._zod?.bag) {
    const bag = schema._zod.bag;
    if (typeof bag.minimum === 'number') json.minLength = bag.minimum;
    if (typeof bag.maximum === 'number') json.maxLength = bag.maximum;
    if (bag.format) {
      const formatMap: Record<string, string | undefined> = {
        guid: 'uuid',
        url: 'uri',
        datetime: 'date-time',
        json_string: 'json-string',
        regex: undefined, // regex format should not be set
      };
      const mappedFormat = formatMap[bag.format] ?? bag.format;
      // Only set format if it's not empty and not "regex"
      if (mappedFormat && mappedFormat !== '' && mappedFormat !== 'regex') {
        json.format = mappedFormat;
      }
    }
    if (bag.patterns && bag.patterns.size > 0) {
      const regexes = [...bag.patterns];
      if (regexes.length === 1) {
        json.pattern = regexes[0]!.source;
      } else if (regexes.length > 1) {
        json.allOf = regexes.map((regex: RegExp) => ({
          ...(ctx.target === 'draft-07' || ctx.target === 'draft-04' || ctx.target === 'openapi-3.0'
            ? { type: 'string' as const }
            : {}),
          pattern: regex.source,
        }));
      }
    }
  }
};

const numberProcessor: Processor = (schema, ctx, json, _params) => {
  const def = getDef(schema);

  // Check if it's an integer type
  let isInteger = false;
  if (def.checks) {
    for (const check of def.checks) {
      if (check.kind === 'int') isInteger = true;
    }
  }
  if (schema._zod?.bag?.format?.includes('int')) {
    isInteger = true;
  }

  json.type = isInteger ? 'integer' : 'number';

  // Handle Zod v3 checks
  if (def.checks) {
    for (const check of def.checks) {
      if (check.kind === 'min') {
        if (check.inclusive === false) {
          if (ctx.target === 'draft-04' || ctx.target === 'openapi-3.0') {
            json.minimum = check.value;
            json.exclusiveMinimum = true;
          } else {
            json.exclusiveMinimum = check.value;
          }
        } else {
          json.minimum = check.value;
        }
      }
      if (check.kind === 'max') {
        if (check.inclusive === false) {
          if (ctx.target === 'draft-04' || ctx.target === 'openapi-3.0') {
            json.maximum = check.value;
            json.exclusiveMaximum = true;
          } else {
            json.exclusiveMaximum = check.value;
          }
        } else {
          json.maximum = check.value;
        }
      }
      if (check.kind === 'multipleOf') {
        json.multipleOf = check.value;
      }
      if (check.kind === 'finite') {
        // Can't represent in JSON Schema, ignore
      }
    }
  }

  // Handle Zod v4 bag
  if (schema._zod?.bag) {
    const bag = schema._zod.bag;

    // Handle exclusiveMinimum
    if (typeof bag.exclusiveMinimum === 'number') {
      if (ctx.target === 'draft-04' || ctx.target === 'openapi-3.0') {
        json.minimum = bag.exclusiveMinimum;
        json.exclusiveMinimum = true;
      } else {
        json.exclusiveMinimum = bag.exclusiveMinimum;
      }
    }

    // Handle minimum (only set if no exclusiveMinimum, or if minimum is more restrictive)
    if (typeof bag.minimum === 'number') {
      if (
        typeof bag.exclusiveMinimum === 'number' &&
        ctx.target !== 'draft-04' &&
        ctx.target !== 'openapi-3.0'
      ) {
        // Only set minimum if it's more restrictive than exclusiveMinimum
        if (bag.minimum > bag.exclusiveMinimum) {
          json.minimum = bag.minimum;
        }
        // Otherwise, exclusiveMinimum already covers it, so skip minimum
      } else if (typeof bag.exclusiveMinimum !== 'number') {
        json.minimum = bag.minimum;
      }
    }

    // Handle exclusiveMaximum
    if (typeof bag.exclusiveMaximum === 'number') {
      if (ctx.target === 'draft-04' || ctx.target === 'openapi-3.0') {
        json.maximum = bag.exclusiveMaximum;
        json.exclusiveMaximum = true;
      } else {
        json.exclusiveMaximum = bag.exclusiveMaximum;
      }
    }

    // Handle maximum (only set if no exclusiveMaximum, or if maximum is more restrictive)
    if (typeof bag.maximum === 'number') {
      if (
        typeof bag.exclusiveMaximum === 'number' &&
        ctx.target !== 'draft-04' &&
        ctx.target !== 'openapi-3.0'
      ) {
        // Only set maximum if it's more restrictive than exclusiveMaximum
        if (bag.maximum < bag.exclusiveMaximum) {
          json.maximum = bag.maximum;
        }
        // Otherwise, exclusiveMaximum already covers it, so skip maximum
      } else if (typeof bag.exclusiveMaximum !== 'number') {
        json.maximum = bag.maximum;
      }
    }

    if (typeof bag.multipleOf === 'number') json.multipleOf = bag.multipleOf;
  }
};

const booleanProcessor: Processor = (_schema, _ctx, json, _params) => {
  json.type = 'boolean';
};

const bigintProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('BigInt cannot be represented in JSON Schema');
  }
};

const symbolProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Symbols cannot be represented in JSON Schema');
  }
};

const nullProcessor: Processor = (_schema, ctx, json, _params) => {
  if (ctx.target === 'openapi-3.0') {
    json.type = 'string';
    json.nullable = true;
    json.enum = [null];
  } else {
    json.type = 'null';
  }
};

const undefinedProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Undefined cannot be represented in JSON Schema');
  }
};

const voidProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Void cannot be represented in JSON Schema');
  }
};

const neverProcessor: Processor = (_schema, _ctx, json, _params) => {
  json.not = {};
};

const anyProcessor: Processor = (_schema, _ctx, _json, _params) => {
  // empty schema accepts anything
};

const unknownProcessor: Processor = (_schema, _ctx, _json, _params) => {
  // empty schema accepts anything
};

const dateProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Date cannot be represented in JSON Schema');
  }
};

const enumProcessor: Processor = (schema, _ctx, json, _params) => {
  const def = getDef(schema);
  // Zod v3: def.values is the enum values
  // Zod v4: def.entries
  const values = def.values ?? (def.entries ? getEnumValues(def.entries) : []);

  if (values.every((v: any) => typeof v === 'number')) json.type = 'number';
  if (values.every((v: any) => typeof v === 'string')) json.type = 'string';
  json.enum = values;
};

const nativeEnumProcessor: Processor = (schema, _ctx, json, _params) => {
  const def = getDef(schema);
  const values = getEnumValues(def.enum);

  if (values.every((v) => typeof v === 'number')) json.type = 'number';
  if (values.every((v) => typeof v === 'string')) json.type = 'string';
  json.enum = values;
};

const literalProcessor: Processor = (schema, ctx, json, _params) => {
  const def = getDef(schema);
  // Zod v3: def.value
  // Zod v4: def.values (Set)
  let values: any[] = [];

  if (def.value !== undefined) {
    values = [def.value];
  } else if (def.values) {
    values = [...def.values];
  }

  const validValues: (string | number | boolean | null)[] = [];
  for (const val of values) {
    if (val === undefined) {
      if (ctx.unrepresentable === 'throw') {
        throw new Error('Literal `undefined` cannot be represented in JSON Schema');
      }
    } else if (typeof val === 'bigint') {
      if (ctx.unrepresentable === 'throw') {
        throw new Error('BigInt literals cannot be represented in JSON Schema');
      } else {
        validValues.push(Number(val));
      }
    } else {
      validValues.push(val);
    }
  }

  if (validValues.length === 0) {
    return;
  } else if (validValues.length === 1) {
    const val = validValues[0]!;
    json.type = val === null ? 'null' : (typeof val as any);
    if (ctx.target === 'draft-04' || ctx.target === 'openapi-3.0') {
      json.enum = [val];
    } else {
      json.const = val;
    }
  } else {
    if (validValues.every((v) => typeof v === 'number')) json.type = 'number';
    if (validValues.every((v) => typeof v === 'string')) json.type = 'string';
    if (validValues.every((v) => typeof v === 'boolean')) json.type = 'boolean';
    if (validValues.every((v) => v === null)) json.type = 'null';
    json.enum = validValues;
  }
};

const nanProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('NaN cannot be represented in JSON Schema');
  }
};

const arrayProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  json.type = 'array';

  // Get element type
  // Zod v4: def.element
  // Zod v3: def.type
  const element = def.element ?? def.type;
  if (element && typeof element === 'object') {
    json.items = process(element, ctx, { ...params, path: [...params.path, 'items'] });
  }

  // Handle length constraints (Zod v3)
  if (def.minLength !== undefined) json.minItems = def.minLength.value;
  if (def.maxLength !== undefined) json.maxItems = def.maxLength.value;
  if (def.exactLength !== undefined) {
    json.minItems = def.exactLength.value;
    json.maxItems = def.exactLength.value;
  }

  // Handle Zod v4 bag
  if (schema._zod?.bag) {
    const bag = schema._zod.bag;
    if (typeof bag.minimum === 'number') json.minItems = bag.minimum;
    if (typeof bag.maximum === 'number') json.maxItems = bag.maximum;
  }
};

const objectProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  json.type = 'object';
  json.properties = {};

  // Get shape - Zod v3: def.shape() is a function, Zod v4: def.shape is an object
  const shape = typeof def.shape === 'function' ? def.shape() : def.shape;

  if (shape) {
    for (const key in shape) {
      if (Object.prototype.hasOwnProperty.call(shape, key)) {
        json.properties[key] = process(shape[key], ctx, {
          ...params,
          path: [...params.path, 'properties', key],
        });
      }
    }

    // Required keys - check for optionality
    const requiredKeys: string[] = [];
    for (const key in shape) {
      if (!Object.prototype.hasOwnProperty.call(shape, key)) continue;
      const fieldSchema = shape[key];
      const fieldTypeName = getZodTypeName(fieldSchema);

      // Check if field is optional
      // Note: In Zod v4, .default() still makes a field "required" in the output
      // Only .optional() makes a field optional
      let isOptional = false;

      if (isZodV4(fieldSchema)) {
        // Zod v4: check optin/optout for optionality
        if (ctx.io === 'input') {
          isOptional = fieldSchema._zod.optin !== undefined;
        } else {
          isOptional = fieldSchema._zod.optout !== undefined;
        }
      } else {
        // Zod v3: check type name
        isOptional = fieldTypeName === 'optional' || fieldSchema?.isOptional?.();
      }

      if (!isOptional) {
        requiredKeys.push(key);
      }
    }

    if (requiredKeys.length > 0) {
      json.required = requiredKeys;
    }
  }

  // Handle catchall/additionalProperties
  // Zod v3: def.catchall or def.unknownKeys
  // Zod v4: def.catchall
  const catchall = def.catchall;
  if (catchall) {
    const catchallTypeName = getZodTypeName(catchall);
    if (catchallTypeName === 'never') {
      json.additionalProperties = false;
    } else {
      json.additionalProperties = process(catchall, ctx, {
        ...params,
        path: [...params.path, 'additionalProperties'],
      });
    }
  } else if (def.unknownKeys === 'strict') {
    json.additionalProperties = false;
  } else if (def.unknownKeys === 'passthrough') {
    // Allow any additional properties
  } else {
    // Default: strip unknown keys (output only has known props)
    if (ctx.io === 'output') {
      json.additionalProperties = false;
    }
  }
};

const unionProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  const options = def.options ?? [];

  // Zod v4: def.inclusive === false means it's exclusive (oneOf)
  // This handles both regular unions AND discriminated unions in v4
  const isExclusive = def.inclusive === false;

  const processedOptions = options.map((x: any, i: number) =>
    process(x, ctx, {
      ...params,
      path: [...params.path, isExclusive ? 'oneOf' : 'anyOf', i],
    })
  );

  if (isExclusive) {
    json.oneOf = processedOptions;
  } else {
    json.anyOf = processedOptions;
  }
};

const discriminatedUnionProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  const options = def.options ?? [];

  // Discriminated unions use oneOf (exactly one match)
  const processedOptions = options.map((x: any, i: number) =>
    process(x, ctx, {
      ...params,
      path: [...params.path, 'oneOf', i],
    })
  );

  json.oneOf = processedOptions;
};

// Zod v4 uses "union" type for both regular unions and discriminated unions
// Need to check the "inclusive" property - if false, it's a discriminated/exclusive union
const unionProcessorV4: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  const options = def.options ?? [];

  // Check if this is an exclusive union (discriminated union in v4)
  // Zod v4: def.inclusive === false means it's exclusive (oneOf)
  const isExclusive = def.inclusive === false;

  const processedOptions = options.map((x: any, i: number) =>
    process(x, ctx, {
      ...params,
      path: [...params.path, isExclusive ? 'oneOf' : 'anyOf', i],
    })
  );

  if (isExclusive) {
    json.oneOf = processedOptions;
  } else {
    json.anyOf = processedOptions;
  }
};

const intersectionProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  const left = def.left;
  const right = def.right;

  const a = process(left, ctx, { ...params, path: [...params.path, 'allOf', 0] });
  const b = process(right, ctx, { ...params, path: [...params.path, 'allOf', 1] });

  const isSimple = (val: any) => 'allOf' in val && Object.keys(val).length === 1;
  const allOf = [
    ...(isSimple(a) ? (a.allOf as any[]) : [a]),
    ...(isSimple(b) ? (b.allOf as any[]) : [b]),
  ];

  json.allOf = allOf;
};

const tupleProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  json.type = 'array';

  const items = def.items ?? [];
  const rest = def.rest;

  const prefixPath = ctx.target === 'draft-2020-12' ? 'prefixItems' : 'items';
  const restPath =
    ctx.target === 'draft-2020-12'
      ? 'items'
      : ctx.target === 'openapi-3.0'
      ? 'items'
      : 'additionalItems';

  const prefixItems = items.map((x: any, i: number) =>
    process(x, ctx, {
      ...params,
      path: [...params.path, prefixPath, i],
    })
  );

  const restSchema = rest
    ? process(rest, ctx, {
        ...params,
        path: [...params.path, restPath],
      })
    : null;

  if (ctx.target === 'draft-2020-12') {
    json.prefixItems = prefixItems;
    if (restSchema) {
      json.items = restSchema;
    }
    // Note: Native Zod v4 does NOT add "items: false" when there's no rest
  } else if (ctx.target === 'openapi-3.0') {
    json.items = { anyOf: prefixItems };
    if (restSchema) {
      (json.items as any).anyOf.push(restSchema);
    }
    json.minItems = prefixItems.length;
    if (!restSchema) {
      json.maxItems = prefixItems.length;
    }
  } else {
    json.items = prefixItems;
    if (restSchema) {
      json.additionalItems = restSchema;
    }
    // Note: Native Zod v4 does NOT add "additionalItems: false" when there's no rest
  }
};

const recordProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  json.type = 'object';

  // Zod v3: def.keyType, def.valueType
  // Zod v4: def.keyType, def.valueType
  const keyType = def.keyType;
  const valueType = def.valueType;

  if (ctx.target === 'draft-07' || ctx.target === 'draft-2020-12') {
    if (keyType) {
      json.propertyNames = process(keyType, ctx, {
        ...params,
        path: [...params.path, 'propertyNames'],
      });
    }
  }

  if (valueType) {
    json.additionalProperties = process(valueType, ctx, {
      ...params,
      path: [...params.path, 'additionalProperties'],
    });
  }
};

const mapProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Map cannot be represented in JSON Schema');
  }
};

const setProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Set cannot be represented in JSON Schema');
  }
};

const nullableProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  const innerType = def.innerType;

  const inner = process(innerType, ctx, params);

  if (ctx.target === 'openapi-3.0') {
    Object.assign(json, inner);
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: 'null' }];
  }
};

const optionalProcessor: Processor = (schema, ctx, _json, params) => {
  const def = getDef(schema);
  const innerType = def.innerType;
  process(innerType, ctx, params);

  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.ref = innerType;
  }
};

const defaultProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  const innerType = def.innerType;
  process(innerType, ctx, params);

  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.ref = innerType;
  }

  // Get default value
  const defaultValue = def.defaultValue;
  if (defaultValue !== undefined) {
    try {
      json.default = JSON.parse(
        JSON.stringify(typeof defaultValue === 'function' ? defaultValue() : defaultValue)
      );
    } catch {
      // Can't serialize default value
    }
  }
};

const catchProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  const innerType = def.innerType;
  process(innerType, ctx, params);

  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.ref = innerType;
  }

  // Get catch value
  const catchValue = def.catchValue;
  if (catchValue !== undefined) {
    try {
      json.default = JSON.parse(
        JSON.stringify(typeof catchValue === 'function' ? catchValue(undefined) : catchValue)
      );
    } catch {
      // Can't serialize catch value
    }
  }
};

const lazyProcessor: Processor = (schema, ctx, _json, params) => {
  const def = getDef(schema);
  // Zod v3: def.getter
  // Zod v4: _zod.innerType or def.getter()
  const innerType = schema._zod?.innerType ?? def.getter?.();

  if (innerType) {
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.ref = innerType;
    }
  }
};

const effectsProcessor: Processor = (schema, ctx, _json, params) => {
  const def = getDef(schema);
  const innerType = def.schema;

  if (innerType) {
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.ref = innerType;
    }
  }
};

const brandedProcessor: Processor = (schema, ctx, _json, params) => {
  const def = getDef(schema);
  const innerType = def.type;

  if (innerType) {
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.ref = innerType;
    }
  }
};

const pipelineProcessor: Processor = (schema, ctx, _json, params) => {
  const def = getDef(schema);
  // Zod v3: def.in, def.out
  // Zod v4: def.in, def.out
  const innerType = ctx.io === 'input' ? def.in : def.out;

  if (innerType) {
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.ref = innerType;
    }
  }
};

const readonlyProcessor: Processor = (schema, ctx, json, params) => {
  const def = getDef(schema);
  const innerType = def.innerType ?? def.type;

  if (innerType) {
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.ref = innerType;
    }
  }

  json.readOnly = true;
};

const promiseProcessor: Processor = (schema, ctx, _json, params) => {
  const def = getDef(schema);
  const innerType = def.type ?? def.innerType;

  if (innerType) {
    process(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.ref = innerType;
    }
  }
};

const functionProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Function types cannot be represented in JSON Schema');
  }
};

const transformProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Transforms cannot be represented in JSON Schema');
  }
};

const customProcessor: Processor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === 'throw') {
    throw new Error('Custom types cannot be represented in JSON Schema');
  }
};

// =============================================================================
// Processor Map
// =============================================================================

const processors: Record<string, Processor> = {
  // Primitives
  string: stringProcessor,
  number: numberProcessor,
  boolean: booleanProcessor,
  bigint: bigintProcessor,
  symbol: symbolProcessor,
  null: nullProcessor,
  undefined: undefinedProcessor,
  void: voidProcessor,
  never: neverProcessor,
  any: anyProcessor,
  unknown: unknownProcessor,
  date: dateProcessor,
  nan: nanProcessor,

  // Enums/Literals
  enum: enumProcessor,
  nativeenum: nativeEnumProcessor,
  literal: literalProcessor,

  // Composites
  array: arrayProcessor,
  object: objectProcessor,
  union: unionProcessor,
  discriminatedunion: discriminatedUnionProcessor,
  intersection: intersectionProcessor,
  tuple: tupleProcessor,
  record: recordProcessor,
  map: mapProcessor,
  set: setProcessor,

  // Wrappers
  nullable: nullableProcessor,
  optional: optionalProcessor,
  default: defaultProcessor,
  catch: catchProcessor,
  lazy: lazyProcessor,
  effects: effectsProcessor,
  branded: brandedProcessor,
  pipeline: pipelineProcessor,
  pipe: pipelineProcessor,
  readonly: readonlyProcessor,
  promise: promiseProcessor,

  // Other
  function: functionProcessor,
  transform: transformProcessor,
  custom: customProcessor,

  // Zod v4 specific aliases
  prefault: defaultProcessor,
  nonoptional: optionalProcessor,
  template_literal: stringProcessor,
  file: stringProcessor,
  success: booleanProcessor,
};

// =============================================================================
// Helper Functions
// =============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// Core Processing Functions
// =============================================================================

function process(schema: any, ctx: ToJSONSchemaContext, params: ProcessParams): JSONSchema {
  const typeName = getZodTypeName(schema);

  // Check for already seen schemas
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = params.path;
    }
    return seen.schema;
  }

  // Initialize seen entry
  const result: Seen = { schema: {}, count: 1, cycle: undefined, path: params.path };
  ctx.seen.set(schema, result);

  // Check for custom toJSONSchema method (Zod v4)
  if (schema?._zod?.toJSONSchema) {
    const override = schema._zod.toJSONSchema();
    if (override) {
      result.schema = override;
      return result.schema;
    }
  }

  // Process using appropriate processor
  const newParams = {
    ...params,
    schemaPath: [...params.schemaPath, schema],
    path: params.path,
  };

  if (typeName && processors[typeName]) {
    processors[typeName](schema, ctx, result.schema, newParams);
  } else if (typeName) {
    // Unknown type - try to handle gracefully
    if (ctx.unrepresentable === 'throw') {
      throw new Error(`[toJSONSchema]: Unhandled type: ${typeName}`);
    }
    // Return empty schema for unknown types in 'any' mode
  }

  // Apply description if present (Zod v3 style)
  const def = getDef(schema);
  if (def.description) {
    result.schema.description = def.description;
  }

  // Handle Zod v4 metadata from globalRegistry
  // This is where .describe(), .meta(), etc. store their data
  const registryMeta = getRegistryMetadata(schema);
  if (registryMeta) {
    // Assign all registry metadata (description, title, id, deprecated, etc.)
    for (const [key, value] of Object.entries(registryMeta)) {
      if (value !== undefined) {
        result.schema[key] = value;
      }
    }
  }

  return result.schema;
}

function extractDefs(ctx: ToJSONSchemaContext, rootSchema: any): void {
  const root = ctx.seen.get(rootSchema);
  if (!root) throw new Error('Unprocessed schema. This is a bug.');

  const makeURI = (entry: [any, Seen]): { ref: string; defId?: string } => {
    const defsSegment = ctx.target === 'draft-2020-12' ? '$defs' : 'definitions';

    if (entry[1] === root) {
      return { ref: '#' };
    }

    const schemaId = entry[1].schema.id;
    const defId = (typeof schemaId === 'string' ? schemaId : null) ?? `__schema${ctx.counter++}`;
    return { defId, ref: `#/${defsSegment}/${defId}` };
  };

  const extractToDef = (entry: [any, Seen]): void => {
    if (entry[1].schema.$ref) return;

    const seen = entry[1];
    const { ref, defId } = makeURI(entry);

    seen.def = { ...seen.schema };
    if (defId) seen.defId = defId;

    // Clear schema and set $ref
    const schema = seen.schema;
    for (const key in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        delete schema[key];
      }
    }
    schema.$ref = ref;
  };

  // Throw on cycles if configured
  if (ctx.cycles === 'throw') {
    for (const entry of ctx.seen.entries()) {
      if (entry[1].cycle) {
        throw new Error(
          `Cycle detected: #/${entry[1].cycle?.join('/')}/<root>` +
            '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.'
        );
      }
    }
  }

  // Extract schemas to $defs
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];

    // Root schema
    if (rootSchema === entry[0]) {
      extractToDef(entry);
      continue;
    }

    // Break cycles
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }

    // Extract reused schemas
    if (seen.count > 1 && ctx.reused === 'ref') {
      extractToDef(entry);
      continue;
    }
  }
}

function finalize(ctx: ToJSONSchemaContext, rootSchema: any): JSONSchema {
  const root = ctx.seen.get(rootSchema);
  if (!root) throw new Error('Unprocessed schema. This is a bug.');

  // Flatten refs
  const flattenRef = (zodSchema: any) => {
    const seen = ctx.seen.get(zodSchema);
    if (!seen) return;
    if (seen.ref === null) return;

    const schema = seen.def ?? seen.schema;
    const cached = { ...schema };
    const ref = seen.ref;
    seen.ref = null;

    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      if (refSeen) {
        const refSchema = refSeen.schema;
        if (
          refSchema.$ref &&
          (ctx.target === 'draft-07' || ctx.target === 'draft-04' || ctx.target === 'openapi-3.0')
        ) {
          schema.allOf = schema.allOf ?? [];
          schema.allOf.push(refSchema);
        } else {
          Object.assign(schema, refSchema);
        }
        Object.assign(schema, cached);
      }
    }

    // Execute overrides
    ctx.override({
      zodSchema,
      jsonSchema: schema,
      path: seen.path ?? [],
    });
  };

  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }

  // Build result
  const result: JSONSchema = {};

  if (ctx.target === 'draft-2020-12') {
    result.$schema = 'https://json-schema.org/draft/2020-12/schema';
  } else if (ctx.target === 'draft-07') {
    result.$schema = 'http://json-schema.org/draft-07/schema#';
  } else if (ctx.target === 'draft-04') {
    result.$schema = 'http://json-schema.org/draft-04/schema#';
  }
  // OpenAPI 3.0 should not include $schema

  Object.assign(result, root.def ?? root.schema);

  // Build defs
  const defs: Record<string, JSONSchema> = {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      defs[seen.defId] = seen.def;
    }
  }

  if (Object.keys(defs).length > 0) {
    if (ctx.target === 'draft-2020-12') {
      result.$defs = defs;
    } else {
      result.definitions = defs;
    }
  }

  return JSON.parse(JSON.stringify(result));
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Convert a Zod schema to JSON Schema.
 *
 * Works with both Zod v3 and Zod v4 schemas.
 *
 * @param schema - A Zod schema
 * @param params - Configuration options
 * @returns A JSON Schema object
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { toJSONSchema } from './zod-to-json-schema-polyfill';
 *
 * const schema = z.object({
 *   name: z.string().min(1),
 *   age: z.number().int().positive(),
 * });
 *
 * const jsonSchema = toJSONSchema(schema, { target: 'draft-2020-12' });
 * console.log(jsonSchema);
 * ```
 */
export function toJSONSchema(schema: any, params?: ToJSONSchemaParams): JSONSchema {
  // Normalize target
  let target: JSONSchemaTarget = params?.target ?? 'draft-2020-12';
  if (target === 'draft-4') target = 'draft-04';
  if (target === 'draft-7') target = 'draft-07';

  const ctx: ToJSONSchemaContext = {
    target,
    unrepresentable: params?.unrepresentable ?? 'throw',
    io: params?.io ?? 'output',
    cycles: params?.cycles ?? 'ref',
    reused: params?.reused ?? 'inline',
    override: params?.override ?? (() => {}),
    counter: 0,
    seen: new Map(),
  };

  process(schema, ctx, { path: [], schemaPath: [] });
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
}

// Export types for consumers
export type { ToJSONSchemaParams as ToJSONSchemaOptions };
