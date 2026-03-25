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
import { isPassThroughAny } from '@kbn/zod-helpers/v4';
import zodToJsonSchema, { jsonDescription } from 'zod-to-json-schema';
import type { OpenAPIV3 } from 'openapi-types';

import type { ConvertOptions, KnownParameters } from '../../type';
import { getXState } from '../../util';
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

const instanceofZodTypeObject = (
  type: z.ZodTypeAny | z4.ZodTypeAny
): type is z.ZodObject<z.ZodRawShape> | z4.ZodObject<z4.ZodRawShape> => {
  return instanceofZodTypeKind(type as z.ZodTypeAny, z.ZodFirstPartyTypeKind.ZodObject);
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
  return {
    query: convertObjectMembersToParameterObjects(unwrappedSchema.shape, false),
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
  const schemaKeys = Object.keys(unwrappedSchema.shape);
  validatePathParameters(paramKeys, schemaKeys);
  return {
    params: convertObjectMembersToParameterObjects(unwrappedSchema.shape, true),
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
 * Recursively add `additionalProperties: false` to object schema nodes that
 * don't already have an `additionalProperties` setting.
 *
 * z4.toJSONSchema() only emits `additionalProperties: false` for .strict()
 * objects. Plain z.object() schemas reject extra keys at runtime — this
 * matches the @kbn/config-schema behaviour of always emitting it.
 */
function addAdditionalPropertiesFalse(node: Record<string, any>): Record<string, any> {
  if (typeof node !== 'object' || node === null) return node;

  if (
    (node.type === 'object' || (!node.type && node.properties)) &&
    !('additionalProperties' in node)
  ) {
    node = { ...node, additionalProperties: false };
  }

  if (node.properties && typeof node.properties === 'object') {
    const newProps: Record<string, any> = {};
    for (const [key, value] of Object.entries(node.properties)) {
      newProps[key] =
        typeof value === 'object' && value !== null
          ? addAdditionalPropertiesFalse(value as Record<string, any>)
          : value;
    }
    node = { ...node, properties: newProps };
  }

  for (const combiner of ['anyOf', 'oneOf', 'allOf'] as const) {
    if (Array.isArray(node[combiner])) {
      node = {
        ...node,
        [combiner]: node[combiner].map((branch: unknown) =>
          typeof branch === 'object' && branch !== null
            ? addAdditionalPropertiesFalse(branch as Record<string, any>)
            : branch
        ),
      };
    }
  }

  return node;
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
 * Internal marker injected into a Zod v4 JSON schema node (via the `override`
 * callback) to carry the user-supplied OAS component name through the
 * conversion pipeline.  The key intentionally starts with `x-` so it is a
 * valid JSON-Schema extension and is easy to strip afterwards.
 */
const COMPONENT_ID_MARKER = 'x-kbn-oas-component-id';

/**
 * Internal marker injected into a Zod v4 JSON schema node to carry OAS-native
 * extensions declared via `.meta({ openapi: { ... } })`. Stripped and merged
 * into the final component schema by `extractDefsToShared` / `hoistMarkedSchemas`.
 */
const OAS_EXTENSIONS_MARKER = 'x-kbn-oas-extensions';

/**
 * OAS-specific extensions that can be declared on a Zod v4 schema via
 * `.meta({ openapi: { discriminator: { ... } } })`.
 *
 * These fields are merged verbatim into the generated OAS component schema,
 * filling the gap where Zod/JSON Schema cannot express OAS-native concepts.
 *
 * Example:
 * ```ts
 * export const StreamDefinition = z.union([...]).meta({
 *   id: 'StreamDefinition',
 *   openapi: {
 *     discriminator: {
 *       propertyName: 'type',
 *       mapping: { wired: '#/components/schemas/WiredStreamDefinition' },
 *     },
 *   },
 * });
 * ```
 */
export interface OasMetaExtensions {
  discriminator?: OpenAPIV3.DiscriminatorObject;
  availability?: {
    stability?: 'experimental' | 'beta' | 'stable';
    since?: string;
  };
}

type NormalizedOasMetaExtensions = Omit<OasMetaExtensions, 'availability'> & {
  'x-state'?: string;
};

/**
 * Reads the stable OAS component name for a Zod v4 schema, if one was declared
 * via `.meta({ id: '<name>' })` on the schema.
 *
 * The name must be unique across all schemas in the document and follow OpenAPI
 * component naming rules: `[a-zA-Z0-9._-]+`.
 */
function getZodV4ComponentId(schema: z4.core.$ZodType): string | undefined {
  const meta = z4.globalRegistry.get(schema);
  return typeof meta?.id === 'string' ? meta.id : undefined;
}

/**
 * Reads OAS-native extensions declared via `.meta({ openapi: { ... } })`.
 */
function getZodV4OasExtensions(schema: z4.core.$ZodType): OasMetaExtensions | undefined {
  const meta = z4.globalRegistry.get(schema);
  return meta?.openapi as OasMetaExtensions | undefined;
}

function normalizeOasMetaExtensions(
  schema: z4.ZodType,
  env: ConvertOptions['env']
): NormalizedOasMetaExtensions | undefined {
  const meta = getZodV4OasExtensions(schema);
  const autoDiscriminator = meta?.discriminator ? undefined : getZodV4AutoDiscriminator(schema);
  const { availability, ...rest } = meta ?? {};
  const xState = getXState(availability, env ?? { serverless: false });
  const extensions = {
    ...rest,
    ...(autoDiscriminator ? { discriminator: autoDiscriminator } : {}),
    ...(xState !== undefined ? { 'x-state': xState } : {}),
  };

  return Object.keys(extensions).length > 0 ? extensions : undefined;
}

/**
 * Auto-detects `z4.discriminatedUnion()` schemas and builds an OAS
 * `DiscriminatorObject` from the union's discriminator key and each variant's
 * `meta({ id })`.
 *
 * `z4.toJSONSchema()` produces an identical `anyOf` for both plain unions and
 * discriminated unions — the discriminator information is lost in the JSON
 * Schema output. This function reads it directly from the Zod type's internal
 * `_zod.def.discriminator` field, which is only set on discriminated unions.
 *
 * The `mapping` is only included when every variant has a `meta({ id })` name
 * and a resolvable literal discriminator value. When some variants lack IDs,
 * only `propertyName` is emitted (valid per OAS 3.0 — mapping is optional).
 */
function getZodV4AutoDiscriminator(schema: z4.ZodType): OpenAPIV3.DiscriminatorObject | undefined {
  const def = (schema as any)._zod?.def;
  if (typeof def?.discriminator !== 'string') return undefined;

  const discriminatorKey: string = def.discriminator;
  const options: z4.ZodType[] = def.options ?? [];

  const mapping: Record<string, string> = {};
  let mappingComplete = true;

  for (const opt of options) {
    const id = getZodV4ComponentId(opt);
    const literalValue = (opt as any)._zod?.def?.shape?.[discriminatorKey]?._zod?.def?.values?.[0];
    if (id !== undefined && literalValue !== undefined) {
      mapping[String(literalValue)] = `#/components/schemas/${id}`;
    } else {
      mappingComplete = false;
    }
  }

  return {
    propertyName: discriminatorKey,
    ...(mappingComplete ? { mapping } : {}),
  };
}

/**
 * Recursively rewrite every `$ref` value that starts with `#/$defs/`
 * to point to `#/components/schemas/<uniqueKey>` instead.
 */
function rewriteDefsRefs(obj: unknown, replacements: Record<string, string>): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

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
 *
 * When a `$defs` entry carries the `COMPONENT_ID_MARKER` property (injected by
 * the `override` callback for schemas that declare `.meta({ id })`), that stable
 * name is used instead of the auto-generated `_zod_v4_{batchId}_{key}` name.
 */
function extractDefsToShared(
  defs: Record<string, unknown>,
  jsonSchema: Record<string, unknown>
): { schema: Record<string, unknown>; shared: Record<string, OpenAPIV3.SchemaObject> } {
  const batchId = defsCounter++;
  const replacements: Record<string, string> = {};
  const shared: Record<string, OpenAPIV3.SchemaObject> = {};

  for (const [key, value] of Object.entries(defs)) {
    const def = value as Record<string, unknown>;

    const stableId =
      typeof def[COMPONENT_ID_MARKER] === 'string' ? (def[COMPONENT_ID_MARKER] as string) : null;

    const uniqueKey = stableId ?? `_zod_v4_${batchId}_${key}`;

    replacements[`#/$defs/${key}`] = `#/components/schemas/${uniqueKey}`;

    if (stableId) {
      const {
        [COMPONENT_ID_MARKER]: _idMarker,
        [OAS_EXTENSIONS_MARKER]: oasExt,
        openapi: _openapi,
        ...rest
      } = def;

      shared[uniqueKey] = {
        ...rest,
        ...(oasExt as OasMetaExtensions | undefined),
      } as OpenAPIV3.SchemaObject;
    } else {
      const { [OAS_EXTENSIONS_MARKER]: _ext, openapi: _openapi, ...rest } = def;
      shared[uniqueKey] = rest as OpenAPIV3.SchemaObject;
    }
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

/**
 * Recursively traverse a (post-processed) JSON schema and extract any nodes
 * that still carry the `COMPONENT_ID_MARKER`.  This covers the case where a
 * registered schema appears exactly once (so Zod v4 inlined it rather than
 * placing it in `$defs`): we still want it as a named OAS component.
 *
 * Marked nodes are moved into `shared` and replaced with a `$ref`.
 */
function hoistMarkedSchemas(
  node: unknown,
  shared: Record<string, OpenAPIV3.SchemaObject>
): unknown {
  if (typeof node !== 'object' || node === null) {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((item) => hoistMarkedSchemas(item, shared));
  }

  const obj = node as Record<string, unknown>;

  // $ref nodes are already references — don't recurse into them
  if ('$ref' in obj) {
    return obj;
  }

  const name = obj[COMPONENT_ID_MARKER];

  if (typeof name === 'string') {
    const {
      [COMPONENT_ID_MARKER]: _idMarker,
      [OAS_EXTENSIONS_MARKER]: oasExt,
      openapi: _openapi,
      ...rest
    } = obj;

    // Recursively handle nested marked schemas within this node first
    const processed: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(rest)) {
      processed[k] = hoistMarkedSchemas(v, shared);
    }

    shared[name] = {
      ...processed,
      ...(oasExt as OasMetaExtensions | undefined),
    } as OpenAPIV3.SchemaObject;

    return { $ref: `#/components/schemas/${name}` };
  }

  const result: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(obj)) {
    result[k] = hoistMarkedSchemas(v, shared);
  }

  return result;
}

function mergeInlineOasExtensions(node: unknown): unknown {
  if (typeof node !== 'object' || node === null) {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((item) => mergeInlineOasExtensions(item));
  }

  const obj = node as Record<string, unknown>;
  if ('$ref' in obj) {
    return obj;
  }

  const { [OAS_EXTENSIONS_MARKER]: oasExt, openapi: _openapi, ...rest } = obj;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rest)) {
    result[key] = mergeInlineOasExtensions(value);
  }

  if (oasExt && typeof oasExt === 'object') {
    Object.assign(result, oasExt);
  }

  return result;
}

/**
 * Recursively transform a JSON Schema object (OAS 3.1 / JSON Schema draft 2020-12)
 * into an OpenAPI 3.0-compatible Schema Object.
 *
 * Once we start offering an OAS 3.1 schema, this can be removed. Zod v4 exports OAS 3.1 by default.
 *
 * Transformations applied:
 * - `type: 'null'`  → removed, and `nullable: true` is set on the parent/sibling
 * - `const: value`  → `enum: [value]`
 * - `propertyNames`  → removed (not supported in OAS 3.0)
 * - `anyOf`/`oneOf` containing `{ type: 'null' }` → collapsed into `nullable: true`
 */
function jsonSchemaToOpenApi30(node: Record<string, unknown>): Record<string, unknown> {
  if (typeof node !== 'object' || node === null) return node;

  let result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    // Strip `propertyNames` (not supported in OAS 3.0)
    if (key === 'propertyNames') continue;

    // `const: value` → `enum: [value]`
    if (key === 'const') {
      result.enum = [value];
      continue;
    }

    // Recursively process arrays and objects
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? jsonSchemaToOpenApi30(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = jsonSchemaToOpenApi30(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  // Handle `anyOf`/`oneOf` containing `{ type: 'null' }` branches:
  // Pull out the null branch and set `nullable: true` on the remaining schema.
  for (const combiner of ['anyOf', 'oneOf'] as const) {
    const branches = result[combiner];
    if (!Array.isArray(branches)) continue;

    const nullIdx = branches.findIndex(
      (b: unknown) =>
        typeof b === 'object' &&
        b !== null &&
        (b as Record<string, unknown>).type === 'null' &&
        Object.keys(b as Record<string, unknown>).length === 1
    );

    if (nullIdx === -1) continue;

    // Remove the null branch
    const remaining = branches.filter((_: unknown, i: number) => i !== nullIdx);

    if (remaining.length === 1) {
      // Single remaining branch: merge it into the current level with nullable
      const [sole] = remaining;
      if (typeof sole === 'object' && sole !== null) {
        // Remove the combiner key, spread the sole schema, add nullable
        delete result[combiner];
        result = { ...result, ...(sole as Record<string, unknown>), nullable: true };
      }
    } else {
      // Multiple remaining branches: keep the combiner, add nullable
      result[combiner] = remaining;
      result.nullable = true;
    }
  }

  // Handle top-level `type: 'null'` (standalone null schema)
  if (result.type === 'null') {
    delete result.type;
    result.nullable = true;
  }

  return result;
}

export const convert = (schema: z.ZodTypeAny, opts: ConvertOptions = {}) => {
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
      override: ({ zodSchema, jsonSchema: js }) => {
        // z.never() is "unrepresentable" and gets converted to {} (any) by
        // the 'any' strategy. In JSON Schema / OpenAPI, the correct
        // representation of "never" is { not: {} }, so fix it up here.
        if ('_zod' in zodSchema && (zodSchema as any)._zod?.def?.type === 'never') {
          // Clear all existing keys and set { not: {} }
          for (const key of Object.keys(js)) {
            delete (js as any)[key];
          }
          (js as any).not = {};
          return;
        }

        // Zod v4's toJSONSchema() writes the .meta({ id }) value as a plain
        // `id` property on the JSON schema node. OAS 3.0 Schema Objects do not
        // allow `id`, so we strip it unconditionally here and track the
        // component name via our own COMPONENT_ID_MARKER instead.
        // See https://github.com/colinhacks/zod/issues/5731
        delete (js as any).id;

        // Inject stable OAS component name and optional OAS extensions for
        // schemas that declare .meta({ id }) / .meta({ openapi: { ... } }).
        // Picked up by extractDefsToShared (for $defs entries) and
        // hoistMarkedSchemas (for inline, single-use schemas).
        const componentName = getZodV4ComponentId(zodSchema);

        if (componentName) {
          (js as any)[COMPONENT_ID_MARKER] = componentName;
        }

        const oasExtensions = normalizeOasMetaExtensions(
          zodSchema as unknown as z4.ZodType,
          opts.env
        );

        if (oasExtensions) {
          (js as any)[OAS_EXTENSIONS_MARKER] = oasExtensions;
        }
      },
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

    // Convert JSON Schema (OAS 3.1) constructs to OpenAPI 3.0 equivalents
    processedSchema = jsonSchemaToOpenApi30(processedSchema);
    for (const [key, value] of Object.entries(shared)) {
      shared[key] = jsonSchemaToOpenApi30(
        value as Record<string, unknown>
      ) as OpenAPIV3.SchemaObject;
    }

    // Ensure z.object() schemas carry `additionalProperties: false`.
    // z4.toJSONSchema() only adds this for .strict() objects, but plain z.object()
    // schemas reject extra keys at runtime — match the @kbn/config-schema behaviour.
    processedSchema = addAdditionalPropertiesFalse(processedSchema);
    for (const [key, value] of Object.entries(shared)) {
      shared[key] = addAdditionalPropertiesFalse(
        value as Record<string, any>
      ) as OpenAPIV3.SchemaObject;
    }

    // Convert JSON Schema (OAS 3.1) constructs to OpenAPI 3.0 equivalents
    processedSchema = jsonSchemaToOpenApi30(processedSchema);

    // Extract any registered schemas that were inlined by z4.toJSONSchema()
    // (single-use, non-recursive schemas don't appear in $defs — we hoist them
    // here so they still become named components).
    processedSchema = hoistMarkedSchemas(processedSchema, shared) as Record<string, unknown>;
    processedSchema = mergeInlineOasExtensions(processedSchema) as Record<string, unknown>;

    for (const [key, value] of Object.entries(shared)) {
      shared[key] = mergeInlineOasExtensions(
        hoistMarkedSchemas(value, shared)
      ) as OpenAPIV3.SchemaObject;
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
