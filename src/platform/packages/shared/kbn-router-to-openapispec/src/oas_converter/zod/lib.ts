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
import type { OpenAPIV3 } from 'openapi-types';

import type { KnownParameters } from '../../type';
import { validatePathParameters } from '../common';

// Adapted from from https://github.com/jlalmes/trpc-openapi/blob/aea45441af785518df35c2bc173ae2ea6271e489/src/utils/zod.ts#L1

const createError = (message: string): Error => {
  return new Error(`[Zod converter] ${message}`);
};

function assertInstanceOfZodType(schema: unknown): asserts schema is z.ZodType {
  if (!isZod(schema)) {
    throw createError('Expected schema to be an instance of Zod');
  }
}

const instanceofZodTypeKind = (type: z.ZodType, zodTypeKind: string): boolean => {
  return type?.type === zodTypeKind;
};

const instanceofZodTypeObject = (type: z.ZodType): type is z.ZodObject<z.ZodRawShape> => {
  return instanceofZodTypeKind(type, 'object');
};

type ZodTypeLikeVoid = z.ZodVoid | z.ZodUndefined | z.ZodNever;

const instanceofZodTypeLikeVoid = (type: z.ZodType): type is ZodTypeLikeVoid => {
  return (
    instanceofZodTypeKind(type, 'void') ||
    instanceofZodTypeKind(type, 'undefined') ||
    instanceofZodTypeKind(type, 'never')
  );
};

const unwrapZodLazy = (type: z.ZodType): z.ZodType => {
  if (instanceofZodTypeKind(type, 'lazy')) {
    // In v4, def properties are type-specific. Cast to access lazy-specific getter.
    return unwrapZodLazy((type.def as unknown as { getter: () => z.ZodType }).getter());
  }
  return type;
};

const unwrapZodOptionalDefault = (
  type: z.ZodType
): {
  description: z.ZodType['description'];
  defaultValue: unknown;
  isOptional: boolean;
  innerType: z.ZodType;
} => {
  let description: z.ZodType['description']; // To track the outer description if exists
  let defaultValue: unknown;
  let isOptional = false;
  let innerType = type;

  while (
    instanceofZodTypeKind(innerType, 'optional') ||
    instanceofZodTypeKind(innerType, 'default')
  ) {
    if (instanceofZodTypeKind(innerType, 'optional')) {
      isOptional = innerType.isOptional();
      description = !description ? innerType.description : description;
      // In v4, access innerType from def instead of unwrap() method
      innerType = (innerType.def as unknown as { innerType: z.ZodType }).innerType;
    }
    if (instanceofZodTypeKind(innerType, 'default')) {
      // In v4, def properties are type-specific
      const defWithDefault = innerType.def as unknown as {
        defaultValue: () => unknown;
        innerType: z.ZodType;
      };
      defaultValue = defWithDefault.defaultValue();
      description = !description ? innerType.description : description;
      innerType = defWithDefault.innerType;
    }
  }

  return { description, defaultValue, isOptional, innerType };
};

const unwrapZodType = (type: z.ZodType, unwrapPreprocess: boolean): z.ZodType => {
  if (instanceofZodTypeKind(type, 'lazy')) {
    return unwrapZodType(unwrapZodLazy(type), unwrapPreprocess);
  }

  if (instanceofZodTypeKind(type, 'optional') || instanceofZodTypeKind(type, 'default')) {
    const { innerType } = unwrapZodOptionalDefault(type);
    return unwrapZodType(innerType, unwrapPreprocess);
  }

  // In v4, transforms create ZodPipe instances
  if (instanceofZodTypeKind(type, 'pipe')) {
    // ZodPipe has 'in' and 'out' schemas
    const pipeDef = type.def as unknown as { in: z.ZodType; out: z.ZodType };
    return unwrapZodType(unwrapPreprocess ? pipeDef.in : pipeDef.out, unwrapPreprocess);
  }
  return type;
};

// Recursive type for string-like Zod schemas
// Use 'any' for recursive generics to avoid "excessively deep" TypeScript error
type ZodTypeLikeString =
  | z.ZodString
  | z.ZodOptional<any>
  | z.ZodDefault<any>
  | z.ZodPipe<any, any>
  | z.ZodUnion<any>
  | z.ZodIntersection<any, any>
  | z.ZodLazy<any>
  | z.ZodLiteral<string>
  | z.ZodEnum;

const zodSupportsCoerce = 'coerce' in z;

type ZodTypeCoercible = z.ZodNumber | z.ZodBoolean | z.ZodBigInt | z.ZodDate;

const instanceofZodTypeCoercible = (_type: z.ZodType): _type is ZodTypeCoercible => {
  const type = unwrapZodType(_type, false);
  return (
    instanceofZodTypeKind(type, 'number') ||
    instanceofZodTypeKind(type, 'boolean') ||
    instanceofZodTypeKind(type, 'bigint') ||
    instanceofZodTypeKind(type, 'date')
  );
};

const instanceofZodTypeLikeString = (
  _type: z.ZodType,
  allowMixedUnion: boolean
): _type is ZodTypeLikeString => {
  const type = unwrapZodType(_type, false);

  // In v4, preprocess/transform are ZodPipe - always consider them string-like
  if (instanceofZodTypeKind(type, 'pipe')) {
    return true;
  }

  if (instanceofZodTypeKind(type, 'union')) {
    // In v4, def.options is type-specific
    const unionDef = type.def as unknown as { options: z.ZodType[] };
    return !unionDef.options.some(
      (option: z.ZodType) =>
        !instanceofZodTypeLikeString(option, allowMixedUnion) &&
        !(allowMixedUnion && instanceofZodTypeCoercible(option))
    );
  }

  if (instanceofZodTypeKind(type, 'array')) {
    // In v4, array def has 'type' property for element type
    return instanceofZodTypeLikeString(
      (type.def as unknown as { type: z.ZodType }).type,
      allowMixedUnion
    );
  }
  if (instanceofZodTypeKind(type, 'intersection')) {
    // In v4, intersection def has 'left' and 'right' properties
    const intersectionDef = type.def as unknown as { left: z.ZodType; right: z.ZodType };
    return (
      instanceofZodTypeLikeString(intersectionDef.left, allowMixedUnion) &&
      instanceofZodTypeLikeString(intersectionDef.right, allowMixedUnion)
    );
  }
  if (instanceofZodTypeKind(type, 'literal')) {
    return typeof (type.def as unknown as { value: unknown }).value === 'string';
  }
  if (instanceofZodTypeKind(type, 'enum')) {
    return true;
  }
  if (instanceofZodTypeKind(type, 'nativeEnum')) {
    return !Object.values(
      (type.def as unknown as { values: Record<string, string | number> }).values
    ).some((value) => typeof value === 'number');
  }
  return instanceofZodTypeKind(type, 'string');
};

const convertObjectMembersToParameterObjects = (
  shape: z.ZodRawShape,
  isPathParameter = false,
  knownParameters: KnownParameters = {}
): OpenAPIV3.ParameterObject[] => {
  return Object.entries(shape).map(([shapeKey, subShape]) => {
    // In v4, ZodRawShape values are core.$ZodType, cast to ZodType for compatibility
    const typeWithoutLazy = unwrapZodLazy(subShape as z.ZodType);
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

// Returns a shape object to passes through all known parameters with z.any
const getPassThroughShape = (knownParameters: KnownParameters, isPathParameter = false) => {
  const passThroughShape: Record<string, z.ZodType> = {};
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

export const convert = (schema: z.ZodType) => {
  return {
    shared: {},
    schema: schema.toJSONSchema({
      target: 'openApi3',
    }) as unknown as OpenAPIV3.SchemaObject,
  };
};

export const is = isZod;
