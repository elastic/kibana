/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, isZod } from '@kbn/zod';
import { z as z4 } from '@kbn/zod/v4';
import { isPassThroughAny } from '@kbn/zod-helpers';
import zodToJsonSchema, { jsonDescription } from 'zod-to-json-schema';
import type { OpenAPIV3 } from 'openapi-types';

import type { KnownParameters } from '../../type';
import { validatePathParameters } from '../common';

// Adapted from from https://github.com/jlalmes/trpc-openapi/blob/aea45441af785518df35c2bc173ae2ea6271e489/src/utils/zod.ts#L1

const createError = (message: string): Error => {
  return new Error(`[Zod converter] ${message}`);
};

function assertInstanceOfZodType(schema: unknown): asserts schema is z.ZodTypeAny {
  if (!isZod(schema)) {
    throw createError('Expected schema to be an instance of Zod');
  }
}

// ---------------------------------------------------------------------------
// Zod v4 detection and type helpers
// ---------------------------------------------------------------------------

/**
 * Detect Zod v4 schemas. V4 schemas have `_zod` but NOT `_def` (v3 has `_def`).
 */
function isZodV4(schema: unknown): boolean {
  return (
    !!schema &&
    typeof schema === 'object' &&
    '_zod' in schema &&
    !('_def' in schema && typeof (schema as any)._def?.typeName === 'string')
  );
}

/** Get the v4 def type string from a schema (e.g. "object", "string", "optional") */
function getV4DefType(schema: any): string | undefined {
  return schema?._zod?.def?.type;
}

/**
 * Map from v3 ZodFirstPartyTypeKind enum values to v4 _zod.def.type strings.
 * This allows `instanceofZodTypeKind` to work for both versions.
 */
const V3_TO_V4_TYPE_MAP: Record<string, string> = {
  ZodObject: 'object',
  ZodString: 'string',
  ZodNumber: 'number',
  ZodBoolean: 'boolean',
  ZodBigInt: 'bigint',
  ZodDate: 'date',
  ZodOptional: 'optional',
  ZodDefault: 'default',
  ZodEffects: '_effects_', // special: v4 uses pipe/transform instead
  ZodLazy: 'lazy',
  ZodVoid: 'void',
  ZodUndefined: 'undefined',
  ZodNever: 'never',
  ZodUnion: 'union',
  ZodArray: 'array',
  ZodIntersection: 'intersection',
  ZodLiteral: 'literal',
  ZodEnum: 'enum',
  ZodNativeEnum: 'enum', // v4 unifies nativeEnum into enum
  ZodRecord: 'record',
  ZodMap: 'map',
  ZodSet: 'set',
  ZodAny: 'any',
  ZodUnknown: 'unknown',
  ZodNullable: 'nullable',
  ZodTuple: 'tuple',
};

// ---------------------------------------------------------------------------
// Type detection (v3 + v4)
// ---------------------------------------------------------------------------

const instanceofZodTypeKind = <Z extends z.ZodFirstPartyTypeKind>(
  type: z.ZodTypeAny,
  zodTypeKind: Z
): type is InstanceType<(typeof z)[Z]> => {
  // v3 path
  if (type?._def?.typeName === zodTypeKind) {
    return true;
  }
  // v4 path
  if (isZodV4(type)) {
    const v4Type = V3_TO_V4_TYPE_MAP[zodTypeKind];
    if (v4Type && v4Type !== '_effects_') {
      return getV4DefType(type) === v4Type;
    }
    // For ZodEffects, v4 uses "pipe" or "transform"
    if (zodTypeKind === z.ZodFirstPartyTypeKind.ZodEffects) {
      const defType = getV4DefType(type);
      return defType === 'pipe' || defType === 'transform' || defType === 'prefault';
    }
  }
  return false;
};

const instanceofZodTypeObject = (type: z.ZodTypeAny): type is z.ZodObject<z.ZodRawShape> => {
  return instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodObject);
};

type ZodTypeLikeVoid = z.ZodVoid | z.ZodUndefined | z.ZodNever;

const instanceofZodTypeLikeVoid = (type: z.ZodTypeAny): type is ZodTypeLikeVoid => {
  return (
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodVoid) ||
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodUndefined) ||
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodNever)
  );
};

// ---------------------------------------------------------------------------
// Unwrap helpers (v3 + v4)
// ---------------------------------------------------------------------------

const unwrapZodLazy = (type: z.ZodTypeAny): z.ZodTypeAny => {
  // v4 lazy
  if (isZodV4(type) && getV4DefType(type) === 'lazy') {
    return unwrapZodLazy((type as any)._zod.def.getter());
  }
  // v3 lazy
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodLazy)) {
    return unwrapZodLazy(type._def.getter());
  }
  return type;
};

const unwrapZodOptionalDefault = (
  type: z.ZodTypeAny
): {
  description: z.ZodTypeAny['description'];
  defaultValue: unknown;
  isOptional: boolean;
  innerType: z.ZodTypeAny;
} => {
  let description: z.ZodTypeAny['description'];
  let defaultValue: unknown;
  let isOptional = false;
  let innerType = type;

  if (isZodV4(innerType)) {
    // v4 path: use _zod.def for type detection and innerType access
    while (true) {
      const defType = getV4DefType(innerType);
      if (defType === 'optional') {
        isOptional = true;
        description = !description ? (innerType as any).description : description;
        innerType = (innerType as any)._zod.def.innerType;
      } else if (defType === 'default') {
        defaultValue = (innerType as any)._zod.def.defaultValue;
        // In v4, defaultValue might be a getter function or a raw value
        if (typeof defaultValue === 'function') {
          defaultValue = (defaultValue as () => unknown)();
        }
        description = !description ? (innerType as any).description : description;
        innerType = (innerType as any)._zod.def.innerType;
      } else {
        break;
      }
    }
  } else {
    // v3 path
    while (
      instanceofZodTypeKind(innerType, z.ZodFirstPartyTypeKind.ZodOptional) ||
      instanceofZodTypeKind(innerType, z.ZodFirstPartyTypeKind.ZodDefault)
    ) {
      if (instanceofZodTypeKind(innerType, z.ZodFirstPartyTypeKind.ZodOptional)) {
        isOptional = innerType.isOptional();
        description = !description ? innerType.description : description;
        innerType = innerType.unwrap();
      }
      if (instanceofZodTypeKind(innerType, z.ZodFirstPartyTypeKind.ZodDefault)) {
        defaultValue = innerType._def.defaultValue();
        description = !description ? innerType.description : description;
        innerType = innerType.removeDefault();
      }
    }
  }

  return { description, defaultValue, isOptional, innerType };
};

const unwrapZodType = (type: z.ZodTypeAny, unwrapPreprocess: boolean): z.ZodTypeAny => {
  if (isZodV4(type)) {
    return unwrapZodTypeV4(type, unwrapPreprocess);
  }

  // v3 path (unchanged)
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodLazy)) {
    return unwrapZodType(unwrapZodLazy(type), unwrapPreprocess);
  }

  if (
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodOptional) ||
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodDefault)
  ) {
    const { innerType } = unwrapZodOptionalDefault(type);
    return unwrapZodType(innerType, unwrapPreprocess);
  }

  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodEffects)) {
    if (type._def.effect.type === 'refinement') {
      return unwrapZodType(type._def.schema, unwrapPreprocess);
    }
    if (type._def.effect.type === 'transform') {
      return unwrapZodType(type._def.schema, unwrapPreprocess);
    }
    if (unwrapPreprocess && type._def.effect.type === 'preprocess') {
      return unwrapZodType(type._def.schema, unwrapPreprocess);
    }
  }
  return type;
};

/**
 * Unwrap Zod v4 schemas to find the underlying type.
 *
 * V4 uses "pipe" instead of "effects". The heuristic for pipes:
 * - If `out._zod.def.type === 'transform'`, the original schema is in `in` (e.g. z.string().transform(fn))
 * - Otherwise, the meaningful schema is in `out` (e.g. DeepStrict wrapping: pipe(unknown.check(), schema))
 */
const unwrapZodTypeV4 = (type: z.ZodTypeAny, unwrapPreprocess: boolean): z.ZodTypeAny => {
  const defType = getV4DefType(type);

  if (defType === 'lazy') {
    return unwrapZodTypeV4(unwrapZodLazy(type), unwrapPreprocess);
  }

  if (defType === 'optional' || defType === 'default') {
    const { innerType } = unwrapZodOptionalDefault(type);
    return unwrapZodTypeV4(innerType, unwrapPreprocess);
  }

  if (defType === 'pipe') {
    const pipeIn = (type as any)._zod.def.in;
    const pipeOut = (type as any)._zod.def.out;

    // If out is a transform, the real schema is in `in`
    if (getV4DefType(pipeOut) === 'transform') {
      return unwrapZodTypeV4(pipeIn, unwrapPreprocess);
    }
    // Otherwise (e.g. DeepStrict: pipe(unknown.check(), schema)), the real schema is in `out`
    return unwrapZodTypeV4(pipeOut, unwrapPreprocess);
  }

  // Handle standalone transform: the input schema is not accessible, treat as pass-through
  if (defType === 'transform') {
    return type;
  }

  // Handle prefault (v4 equivalent of v3 preprocess)
  if (defType === 'prefault') {
    if (unwrapPreprocess) {
      const innerType = (type as any)._zod.def.innerType;
      if (innerType) {
        return unwrapZodTypeV4(innerType, unwrapPreprocess);
      }
    }
    return type;
  }

  return type;
};

// ---------------------------------------------------------------------------
// String-like and coercible type detection (v3 + v4)
// ---------------------------------------------------------------------------

interface NativeEnumType {
  [k: string]: string | number;
  [nu: number]: string;
}

type ZodTypeLikeString =
  | z.ZodString
  | z.ZodOptional<ZodTypeLikeString>
  | z.ZodDefault<ZodTypeLikeString>
  | z.ZodEffects<ZodTypeLikeString, unknown, unknown>
  | z.ZodUnion<[ZodTypeLikeString, ...ZodTypeLikeString[]]>
  | z.ZodIntersection<ZodTypeLikeString, ZodTypeLikeString>
  | z.ZodLazy<ZodTypeLikeString>
  | z.ZodLiteral<string>
  | z.ZodEnum<[string, ...string[]]>
  | z.ZodNativeEnum<NativeEnumType>;

const zodSupportsCoerce = 'coerce' in z;

type ZodTypeCoercible = z.ZodNumber | z.ZodBoolean | z.ZodBigInt | z.ZodDate;

const instanceofZodTypeCoercible = (_type: z.ZodTypeAny): _type is ZodTypeCoercible => {
  const type = unwrapZodType(_type, false);

  if (isZodV4(type)) {
    const defType = getV4DefType(type);
    return (
      defType === 'number' || defType === 'boolean' || defType === 'bigint' || defType === 'date'
    );
  }

  return (
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodNumber) ||
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodBoolean) ||
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodBigInt) ||
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodDate)
  );
};

const instanceofZodTypeLikeString = (
  _type: z.ZodTypeAny,
  allowMixedUnion: boolean
): _type is ZodTypeLikeString => {
  const type = unwrapZodType(_type, false);

  if (isZodV4(type)) {
    return isV4TypeLikeString(type, allowMixedUnion);
  }

  // v3 path (unchanged)
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodEffects)) {
    if (type._def.effect.type === 'preprocess') {
      return true;
    }
  }

  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodUnion)) {
    return !type._def.options.some(
      (option) =>
        !instanceofZodTypeLikeString(option, allowMixedUnion) &&
        !(allowMixedUnion && instanceofZodTypeCoercible(option))
    );
  }

  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodArray)) {
    return instanceofZodTypeLikeString(type._def.type, allowMixedUnion);
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodIntersection)) {
    return (
      instanceofZodTypeLikeString(type._def.left, allowMixedUnion) &&
      instanceofZodTypeLikeString(type._def.right, allowMixedUnion)
    );
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodLiteral)) {
    return typeof type._def.value === 'string';
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodEnum)) {
    return true;
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodNativeEnum)) {
    return !Object.values(type._def.values).some((value) => typeof value === 'number');
  }
  return instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodString);
};

/**
 * V4-specific string-like type detection.
 */
function isV4TypeLikeString(type: z.ZodTypeAny, allowMixedUnion: boolean): boolean {
  const defType = getV4DefType(type);

  // prefault (v4 equivalent of v3 preprocess effect)
  if (defType === 'prefault') {
    return true;
  }

  if (defType === 'union') {
    const options: any[] = (type as any)._zod.def.options;
    return !options.some(
      (option) =>
        !instanceofZodTypeLikeString(option, allowMixedUnion) &&
        !(allowMixedUnion && instanceofZodTypeCoercible(option))
    );
  }

  if (defType === 'array') {
    return instanceofZodTypeLikeString((type as any)._zod.def.element, allowMixedUnion);
  }

  if (defType === 'intersection') {
    return (
      instanceofZodTypeLikeString((type as any)._zod.def.left, allowMixedUnion) &&
      instanceofZodTypeLikeString((type as any)._zod.def.right, allowMixedUnion)
    );
  }

  if (defType === 'literal') {
    const values: unknown[] = (type as any)._zod.def.values;
    return values.every((v) => typeof v === 'string');
  }

  if (defType === 'enum') {
    // v4 enums: check if entries contain numeric values
    const entries = (type as any)._zod.def.entries;
    if (entries && typeof entries === 'object') {
      return !Object.values(entries).some((value) => typeof value === 'number');
    }
    return true;
  }

  // "string" covers both z.string() and z.iso.datetime(), z.email(), etc.
  return defType === 'string';
}

// ---------------------------------------------------------------------------
// Converter functions (v3 + v4)
// ---------------------------------------------------------------------------

const convertObjectMembersToParameterObjects = (
  shape: z.ZodRawShape,
  isPathParameter = false,
  knownParameters: KnownParameters = {}
): OpenAPIV3.ParameterObject[] => {
  return Object.entries(shape).map(([shapeKey, subShape]) => {
    const typeWithoutLazy = unwrapZodLazy(subShape);
    const {
      description: outerDescription,
      isOptional,
      defaultValue,
      innerType: typeWithoutOptionalDefault,
    } = unwrapZodOptionalDefault(typeWithoutLazy);

    // Except for path parameters, OpenAPI supports mixed unions with `anyOf` e.g. for query parameters
    if (!instanceofZodTypeLikeString(typeWithoutOptionalDefault, !isPathParameter)) {
      if (zodSupportsCoerce) {
        if (!instanceofZodTypeCoercible(typeWithoutOptionalDefault)) {
          throw createError(
            `Input parser key: "${shapeKey}" must be ZodString, ZodNumber, ZodBoolean, ZodBigInt or ZodDate`
          );
        }
      } else {
        throw createError(`Input parser key: "${shapeKey}" must be ZodString`);
      }
    }

    const {
      schema: { description: schemaDescription, ...openApiSchemaObject },
    } = convert(typeWithoutOptionalDefault);

    if (typeof defaultValue !== 'undefined') {
      openApiSchemaObject.default = defaultValue;
    }

    return {
      name: shapeKey,
      in: isPathParameter ? 'path' : 'query',
      required: isPathParameter ? !knownParameters[shapeKey]?.optional : !isOptional,
      schema: openApiSchemaObject,
      description: outerDescription || schemaDescription,
    };
  });
};

// Returns a z.ZodRawShape to passes through all known parameters with z.any
const getPassThroughShape = (knownParameters: KnownParameters, isPathParameter = false) => {
  const passThroughShape: z.ZodRawShape = {};
  for (const [key, { optional }] of Object.entries(knownParameters)) {
    passThroughShape[key] = optional && !isPathParameter ? z.string().optional() : z.string();
  }
  return passThroughShape;
};

/**
 * Extract the object shape from a schema, handling both v3 and v4.
 * V4 objects also expose `.shape` in the classic API.
 */
function getObjectShape(schema: z.ZodTypeAny): z.ZodRawShape {
  return (schema as any).shape;
}

export const convertQuery = (schema: unknown) => {
  assertInstanceOfZodType(schema);
  const unwrappedSchema = unwrapZodType(schema, true);

  if (isPassThroughAny(unwrappedSchema)) {
    return {
      query: convertObjectMembersToParameterObjects(getPassThroughShape({}, false), true),
      shared: {},
    };
  }

  if (!instanceofZodTypeObject(unwrappedSchema)) {
    throw createError('Query schema must be an _object_ schema validator!');
  }
  const shape = getObjectShape(unwrappedSchema);
  return {
    query: convertObjectMembersToParameterObjects(shape, false),
    shared: {},
  };
};

export const convertPathParameters = (schema: unknown, knownParameters: KnownParameters) => {
  assertInstanceOfZodType(schema);
  const unwrappedSchema = unwrapZodType(schema, true);
  const paramKeys = Object.keys(knownParameters);
  const paramsCount = paramKeys.length;

  if (paramsCount === 0 && instanceofZodTypeLikeVoid(unwrappedSchema)) {
    return { params: [], shared: {} };
  }

  if (isPassThroughAny(unwrappedSchema)) {
    return {
      params: convertObjectMembersToParameterObjects(
        getPassThroughShape(knownParameters, true),
        true
      ),
      shared: {},
    };
  }

  if (!instanceofZodTypeObject(unwrappedSchema)) {
    throw createError('Parameters schema must be an _object_ schema validator!');
  }
  const shape = getObjectShape(unwrappedSchema);
  const schemaKeys = Object.keys(shape);
  validatePathParameters(paramKeys, schemaKeys);
  return {
    params: convertObjectMembersToParameterObjects(shape, true),
    shared: {},
  };
};

/**
 * Apply the same JSON description extraction that zod-to-json-schema's jsonDescription does.
 * If a schema description is valid JSON, spread its parsed fields into the schema object.
 */
function applyJsonDescription(jsonSchema: Record<string, any>, description?: string) {
  if (description) {
    try {
      return { ...jsonSchema, ...JSON.parse(description) };
    } catch {
      // not JSON, leave as-is
    }
  }
  return jsonSchema;
}

/**
 * Counter used to generate unique keys when hoisting `$defs` entries
 * from `z4.toJSONSchema()` into OpenAPI `components/schemas`.
 * Ensures no key collisions across multiple `convert()` calls.
 */
let defsCounter = 0;

/** @internal Exposed for testing only — resets the `$defs` counter. */
export const resetDefsCounter = () => {
  defsCounter = 0;
};

/**
 * Recursively rewrite every `$ref` value that starts with `#/$defs/`
 * to point to `#/components/schemas/<uniqueKey>` instead.
 */
function rewriteDefsRefs(
  obj: unknown,
  replacements: Record<string, string>
): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map((item) => rewriteDefsRefs(item, replacements));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === '$ref' && typeof value === 'string' && replacements[value]) {
      result[key] = replacements[value];
    } else {
      result[key] = rewriteDefsRefs(value, replacements);
    }
  }
  return result;
}

/**
 * Extract `$defs` from a JSON Schema produced by `z4.toJSONSchema()`, move
 * the entries into `shared` (→ `components/schemas`), and rewrite all
 * `$ref: '#/$defs/...'` pointers so they resolve correctly in the OpenAPI
 * document root.
 */
function extractDefsToShared(
  defs: Record<string, unknown>,
  jsonSchema: Record<string, unknown>
): { schema: Record<string, unknown>; shared: Record<string, OpenAPIV3.SchemaObject> } {
  const batchId = defsCounter++;
  const replacements: Record<string, string> = {};
  const shared: Record<string, OpenAPIV3.SchemaObject> = {};

  for (const [key, value] of Object.entries(defs)) {
    const uniqueKey = `_zod_v4_${batchId}_${key}`;
    replacements[`#/$defs/${key}`] = `#/components/schemas/${uniqueKey}`;
    shared[uniqueKey] = value as OpenAPIV3.SchemaObject;
  }

  // Rewrite $ref paths in the main schema
  const fixedSchema = rewriteDefsRefs(jsonSchema, replacements) as Record<string, unknown>;

  // Rewrite $ref paths inside the shared definitions too (recursive schemas
  // reference themselves via $defs pointers)
  for (const [key, value] of Object.entries(shared)) {
    shared[key] = rewriteDefsRefs(value, replacements) as OpenAPIV3.SchemaObject;
  }

  return { schema: fixedSchema, shared };
}

export const convert = (schema: z.ZodTypeAny) => {
  // Unwrap DeepStrict pipes, optional/default wrappers, transforms, etc.
  // This is critical because makeZodValidationObject wraps ALL Zod schemas
  // (including v3) with v4's DeepStrict, producing a v4 pipe around v3 schemas.
  // We must unwrap to find the real inner schema before choosing the converter.
  const unwrapped = unwrapZodType(schema, true);

  if (isZodV4(unwrapped)) {
    // Use Zod v4's native toJSONSchema
    const raw = z4.toJSONSchema(unwrapped as unknown as z4.ZodType, {
      unrepresentable: 'any',
      io: 'input',
    }) as Record<string, any>;

    // Remove $schema (not valid inside OpenAPI schema objects)
    const { $schema, $defs, ...jsonSchema } = raw;

    let shared: Record<string, OpenAPIV3.SchemaObject> = {};
    let processedSchema: Record<string, unknown> = jsonSchema;

    // z4.toJSONSchema() emits `$defs` for recursive schemas (e.g. FilterCondition
    // with self-referencing and/or/not). OpenAPI 3.0 doesn't support inline `$defs`
    // — refs must point to `#/components/schemas/...`. Extract them.
    if ($defs && typeof $defs === 'object' && Object.keys($defs).length > 0) {
      const extracted = extractDefsToShared($defs, jsonSchema);
      processedSchema = extracted.schema;
      shared = extracted.shared;
    }

    // Apply the same JSON-description post-processing as v3
    const description = (unwrapped as any).description;
    const processed = applyJsonDescription(processedSchema as Record<string, any>, description);

    return {
      shared,
      schema: processed as OpenAPIV3.SchemaObject,
    };
  }

  // v3 path (unchanged)
  return {
    shared: {},
    schema: zodToJsonSchema(unwrapped, {
      target: 'openApi3',
      $refStrategy: 'none',
      postProcess: jsonDescription,
    }) as OpenAPIV3.SchemaObject,
  };
};

export const is = isZod;
