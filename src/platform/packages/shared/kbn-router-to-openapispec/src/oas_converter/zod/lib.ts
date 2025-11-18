/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, isZod } from '@kbn/zod';
import { isPassThroughAny } from '@kbn/zod-helpers';
import zodToJsonSchema from 'zod-to-json-schema';
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

const instanceofZodTypeKind = <Z extends z.ZodFirstPartyTypeKind>(
  type: z.ZodTypeAny,
  zodTypeKind: Z
): type is InstanceType<(typeof z)[Z]> => {
  return type?._def?.typeName === zodTypeKind;
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

const unwrapZodLazy = (type: z.ZodTypeAny): z.ZodTypeAny => {
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
  let description: z.ZodTypeAny['description']; // To track the outer description if exists
  let defaultValue: unknown;
  let isOptional = false;
  let innerType = type;

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

  return { description, defaultValue, isOptional, innerType };
};

const unwrapZodType = (type: z.ZodTypeAny, unwrapPreprocess: boolean): z.ZodTypeAny => {
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

    const { schema: convertedSchema } = convert(typeWithoutOptionalDefault);

    // For parameter schemas we expect an inline schema object, not a $ref wrapper.
    const { description: schemaDescription, ...openApiSchemaObject } =
      convertedSchema as OpenAPIV3.SchemaObject;

    if (typeof defaultValue !== 'undefined') {
      (openApiSchemaObject as OpenAPIV3.SchemaObject).default = defaultValue;
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
  const shape = unwrappedSchema.shape;
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
  const shape = unwrappedSchema.shape;
  const schemaKeys = Object.keys(shape);
  validatePathParameters(paramKeys, schemaKeys);
  return {
    params: convertObjectMembersToParameterObjects(shape, true),
    shared: {},
  };
};

/**
 * Replace any JSON Schema $ref that points at "#/definitions/..." with an OpenAPI-compatible
 * "#/components/schemas/..." pointer. This is used to adapt zod-to-json-schema's output
 * (which uses "definitions" even for target: 'openApi3') to the structure expected by
 * the router-to-openapispec components collection.
 */
const replaceDefinitionRefs = <T>(schema: T): T => {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => replaceDefinitionRefs(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/definitions/')) {
      result[key] = value.replace('#/definitions/', '#/components/schemas/');
    } else {
      result[key] = replaceDefinitionRefs(value);
    }
  }

  return result as T;
};

const COMPONENT_PREFIX = '@kbn/oas-component:';

/**
 * Walk a JSON Schema produced by zod-to-json-schema, extract any sub-schemas that
 * carry an "@kbn/oas-component:<Name>" description as reusable OpenAPI components,
 * and replace those inlined sub-schemas with $ref pointers.
 */
const extractComponentsFromSchema = (
  schema: unknown,
  components: { [id: string]: OpenAPIV3.SchemaObject }
): unknown => {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return (schema as unknown[]).map((item) => extractComponentsFromSchema(item, components));
  }

  const obj = schema as Record<string, unknown>;

  const description = obj.description;
  if (typeof description === 'string' && description.startsWith(COMPONENT_PREFIX)) {
    const componentId = description.slice(COMPONENT_PREFIX.length);

    // Drop the synthetic description and recursively process the component body
    // so nested components (if any) are also extracted.
    const { description: _ignored, ...rest } = obj;
    const processedComponent = extractComponentsFromSchema(
      rest,
      components
    ) as OpenAPIV3.SchemaObject;

    if (!components[componentId]) {
      components[componentId] = processedComponent;

      // Special-case fixups for well-known components whose recursive positions
      // are otherwise erased by zod-to-json-schema. StreamlangCondition is a
      // discriminated union over itself, but the generated JSON Schema uses
      // `{}` in recursive positions (e.g. "and.items": {}, "or.items": {}, "not": {}).
      // Replace those with self-refs so downstream generators (like oapi-codegen)
      // see a properly-typed recursive union.
      if (componentId === 'StreamlangCondition') {
        const ensureSelfRef = (value: unknown): OpenAPIV3.ReferenceObject | undefined => {
          if (
            value &&
            typeof value === 'object' &&
            Object.keys(value as Record<string, unknown>).length === 0
          ) {
            return { $ref: '#/components/schemas/StreamlangCondition' };
          }
          return undefined;
        };

        const condition = components[componentId] as OpenAPIV3.SchemaObject;
        if (condition && Array.isArray((condition as any).anyOf)) {
          for (const variant of (condition as any).anyOf as Array<OpenAPIV3.SchemaObject>) {
            if (!variant || typeof variant !== 'object') continue;

            const props = (variant as any).properties as
              | { [key: string]: OpenAPIV3.SchemaObject }
              | undefined;
            const typeEnum = (props as any)?.type?.enum as unknown;

            // and-condition: properties.type.enum includes "and"
            if (
              Array.isArray(typeEnum) &&
              typeEnum.includes('and') &&
              props?.and &&
              typeof props.and === 'object'
            ) {
              const andSchema = props.and as OpenAPIV3.ArraySchemaObject;
              const replacement = ensureSelfRef(andSchema.items as unknown);
              if (replacement) {
                andSchema.items = replacement;
              }
            }

            // or-condition: properties.type.enum includes "or"
            if (
              Array.isArray(typeEnum) &&
              typeEnum.includes('or') &&
              props?.or &&
              typeof props.or === 'object'
            ) {
              const orSchema = props.or as OpenAPIV3.ArraySchemaObject;
              const replacement = ensureSelfRef(orSchema.items as unknown);
              if (replacement) {
                orSchema.items = replacement;
              }
            }

            // not-condition: properties.type.enum includes "not"
            if (Array.isArray(typeEnum) && typeEnum.includes('not') && props && 'not' in props) {
              const replacement = ensureSelfRef(props.not as unknown);
              if (replacement) {
                props.not = replacement as OpenAPIV3.SchemaObject;
              }
            }
          }
        }
      }
    }

    return {
      $ref: `#/components/schemas/${componentId}`,
    };
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = extractComponentsFromSchema(value, components);
  }

  return result;
};

export const convert = (schema: z.ZodTypeAny) => {
  const rawJsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as OpenAPIV3.SchemaObject;

  const shared: { [id: string]: OpenAPIV3.SchemaObject } = {};
  const schemaWithRefs = extractComponentsFromSchema(
    rawJsonSchema,
    shared
  ) as OpenAPIV3.SchemaObject;

  // Final fix-up pass for well-known components where recursive positions
  // may still appear as "{}" after extraction. This is intentionally
  // conservative and only touches the specific StreamlangCondition shape.
  const streamlangCondition = shared['StreamlangCondition'] as OpenAPIV3.SchemaObject | undefined;
  if (streamlangCondition && Array.isArray((streamlangCondition as any).anyOf)) {
    const ensureSelfRef = (value: unknown): OpenAPIV3.ReferenceObject | undefined => {
      if (
        value &&
        typeof value === 'object' &&
        Object.keys(value as Record<string, unknown>).length === 0
      ) {
        return { $ref: '#/components/schemas/StreamlangCondition' };
      }
      return undefined;
    };

    for (const variant of (streamlangCondition as any).anyOf as Array<OpenAPIV3.SchemaObject>) {
      if (!variant || typeof variant !== 'object') continue;

      const props = (variant as any).properties as
        | { [key: string]: OpenAPIV3.SchemaObject }
        | undefined;
      const typeEnum = (props as any)?.type?.enum as unknown;

      // and-condition
      if (
        Array.isArray(typeEnum) &&
        typeEnum.includes('and') &&
        props?.and &&
        typeof props.and === 'object'
      ) {
        const andSchema = props.and as OpenAPIV3.ArraySchemaObject;
        const replacement = ensureSelfRef(andSchema.items as unknown);
        if (replacement) {
          andSchema.items = replacement;
        }
      }

      // or-condition
      if (
        Array.isArray(typeEnum) &&
        typeEnum.includes('or') &&
        props?.or &&
        typeof props.or === 'object'
      ) {
        const orSchema = props.or as OpenAPIV3.ArraySchemaObject;
        const replacement = ensureSelfRef(orSchema.items as unknown);
        if (replacement) {
          orSchema.items = replacement;
        }
      }

      // not-condition
      if (Array.isArray(typeEnum) && typeEnum.includes('not') && props && 'not' in props) {
        const replacement = ensureSelfRef(props.not as unknown);
        if (replacement) {
          props.not = replacement as OpenAPIV3.SchemaObject;
        }
      }
    }
  }

  return {
    shared,
    schema: replaceDefinitionRefs(schemaWithRefs) as OpenAPIV3.SchemaObject,
  };
};

export const is = isZod;
