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

import type { Writable } from '@kbn/utility-types';
import type { KnownParameters } from '../../type';
import { validatePathParameters } from '../common';

// Adapted from from https://github.com/mcampa/trpc-to-openapi/blob/6fefcad64aa0d9e03b0cd1a60706d242d878272e/src/utils/zod.ts

const createError = (message: string): Error => {
  return new Error(`[Zod converter] ${message}`);
};

function assertInstanceOfZodType(schema: unknown): asserts schema is z.ZodTypeAny {
  if (!isZod(schema)) {
    throw createError('Expected schema to be an instance of Zod');
  }
}

const instanceofZodTypeKind = <Z extends z.core.$ZodTypeDef['type']>(
  type: z.core.$ZodType,
  zodTypeKind: Z
): type is z.core.$ZodTypes => {
  return type?._zod?.def?.type === zodTypeKind;
};

export const instanceofZodTypeObject = (
  type: z.core.$ZodType
): type is z.ZodObject<z.ZodRawShape> => {
  return instanceofZodTypeKind(type, 'object');
};

type ZodTypeLikeVoid = z.ZodVoid | z.ZodUndefined | z.ZodNever;

const instanceofZodTypeLikeVoid = (type: z.ZodTypeAny): type is ZodTypeLikeVoid => {
  return (
    instanceofZodTypeKind(type, 'void') ||
    instanceofZodTypeKind(type, 'undefined') ||
    instanceofZodTypeKind(type, 'never')
  );
};

const unwrapZodLazy = (type: z.ZodTypeAny): z.ZodTypeAny => {
  if (instanceofZodTypeKind(type, 'lazy')) {
    return unwrapZodLazy((type as z.ZodLazy<z.ZodTypeAny>).def.getter());
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
    instanceofZodTypeKind(innerType, 'optional') ||
    instanceofZodTypeKind(innerType, 'default')
  ) {
    if (instanceofZodTypeKind(innerType, 'optional')) {
      isOptional = innerType.safeParse(undefined).success;
      description = !description ? innerType.description : description;
      innerType = (innerType as z.ZodOptional<z.ZodTypeAny>).unwrap();
    }
    if (instanceofZodTypeKind(innerType, 'default')) {
      defaultValue = (innerType as z.ZodDefault<z.ZodTypeAny>).def.defaultValue;
      description = !description ? innerType.description : description;
      innerType = (innerType as z.ZodDefault<z.ZodTypeAny>).unwrap();
    }
  }

  return { description, defaultValue, isOptional, innerType };
};

export const unwrapZodType = (
  type: z.core.$ZodType,
  unwrapPreprocess: boolean
): z.core.$ZodType => {
  if (instanceofZodTypeKind(type, 'array')) {
    return unwrapZodType((type as z.ZodArray<z.core.$ZodTypes>).element, unwrapPreprocess);
  }
  if (instanceofZodTypeKind(type, 'enum')) {
    return unwrapZodType(z.string(), unwrapPreprocess);
  }
  if (instanceofZodTypeKind(type, 'nullable')) {
    return unwrapZodType((type as z.ZodNullable<z.core.$ZodTypes>).unwrap(), unwrapPreprocess);
  }
  if (instanceofZodTypeKind(type, 'optional')) {
    return unwrapZodType((type as z.ZodOptional<z.core.$ZodTypes>).unwrap(), unwrapPreprocess);
  }
  if (instanceofZodTypeKind(type, 'default')) {
    return unwrapZodType((type as z.ZodDefault<z.core.$ZodTypes>).unwrap(), unwrapPreprocess);
  }
  if (instanceofZodTypeKind(type, 'lazy')) {
    return unwrapZodType((type as z.ZodLazy<z.core.$ZodTypes>).def.getter(), unwrapPreprocess);
  }
  if (instanceofZodTypeKind(type, 'pipe') && unwrapPreprocess) {
    return unwrapZodType((type as z.ZodPipe<z.core.$ZodTypes>).def.out, unwrapPreprocess);
  }
  return type as z.core.$ZodType;
};

type ZodTypeLikeString =
  | z.ZodString
  | z.ZodOptional<z.core.$ZodTypes>
  | z.ZodDefault<z.core.$ZodTypes>
  | z.ZodUnion<[z.core.$ZodTypes, ...z.core.$ZodTypes[]]>
  | z.ZodIntersection<z.core.$ZodTypes, z.core.$ZodTypes>
  | z.ZodLazy<z.core.$ZodTypes>
  | z.ZodLiteral<string>
  | z.ZodEnum<Record<string, string | number>>;

const zodSupportsCoerce = 'coerce' in z;

type ZodTypeCoercible = z.ZodNumber | z.ZodBoolean | z.ZodBigInt | z.ZodDate;

const instanceofZodTypeCoercible = (_type: z.core.$ZodType): _type is ZodTypeCoercible => {
  const type = unwrapZodType(_type, false);
  return (
    instanceofZodTypeKind(type, 'number') ||
    instanceofZodTypeKind(type, 'boolean') ||
    instanceofZodTypeKind(type, 'bigint') ||
    instanceofZodTypeKind(type, 'date')
  );
};
const instanceofZodTypeLikeString = (
  _type: z.core.$ZodType,
  allowMixedUnion: boolean
): _type is ZodTypeLikeString => {
  const type = unwrapZodType(_type, false);

  if (instanceofZodTypeKind(type, 'pipe')) {
    return true;
  }

  if (instanceofZodTypeKind(type, 'union')) {
    return !(type as z.ZodUnion<z.core.$ZodTypes[]>).options.some(
      (option) =>
        !instanceofZodTypeLikeString(option, allowMixedUnion) &&
        !(allowMixedUnion && instanceofZodTypeCoercible(option))
    );
  }

  if (instanceofZodTypeKind(type, 'array')) {
    return instanceofZodTypeLikeString(
      (type as z.ZodArray<z.core.$ZodTypes>).element,
      allowMixedUnion
    );
  }
  if (instanceofZodTypeKind(type, 'intersection')) {
    return (
      instanceofZodTypeLikeString(
        (type as z.ZodIntersection<z.core.$ZodTypes, z.core.$ZodTypes>).def.left,
        allowMixedUnion
      ) &&
      instanceofZodTypeLikeString(
        (type as z.ZodIntersection<z.core.$ZodTypes, z.core.$ZodTypes>).def.right,
        allowMixedUnion
      )
    );
  }
  if (instanceofZodTypeKind(type, 'literal')) {
    return (type as z.ZodLiteral<string>).values
      .values()
      .every((value) => typeof value === 'string');
  }
  if (instanceofZodTypeKind(type, 'enum')) {
    return !Object.values((type as z.ZodEnum).enum).some((value) => typeof value === 'number');
  }
  return instanceofZodTypeKind(type, 'string');
};

const convertObjectMembersToParameterObjects = (
  shape: z.ZodRawShape,
  isPathParameter = false,
  knownParameters: KnownParameters = {}
): OpenAPIV3.ParameterObject[] => {
  return Object.entries(shape).map(([shapeKey, subShape]) => {
    const typeWithoutLazy = unwrapZodLazy(subShape as z.ZodTypeAny);
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
  const passThroughShape: Writable<z.ZodRawShape> = {};
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

  if (paramsCount === 0 && instanceofZodTypeLikeVoid(unwrappedSchema as z.ZodTypeAny)) {
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

export const convert = (schema: z.ZodTypeAny) => {
  return {
    shared: {},
    schema: z.toJSONSchema(schema, {
      target: 'openapi-3.0',
      cycles: 'ref',
      reused: 'inline',
      unrepresentable: 'any',
    }) as OpenAPIV3.SchemaObject,
  };
};

export const is = isZod;
