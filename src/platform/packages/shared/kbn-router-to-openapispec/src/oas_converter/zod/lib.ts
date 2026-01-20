/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { isZod } from '@kbn/zod';
import { isPassThroughAny } from '@kbn/zod-helpers';
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

const instanceofZodTypeKind = (type: z.ZodTypeAny | z.core.$ZodType, zodTypeKind: z.core.$ZodTypeDef['type']) => {
  if (type instanceof z.ZodType) {
    return type.def.type === zodTypeKind;
  }
  return type._zod.def.type === zodTypeKind;
};

type ZodTypeLikeVoid = z.ZodVoid | z.ZodUndefined | z.ZodNever;

const instanceofZodTypeLikeVoid = (type: z.ZodTypeAny | z.core.$ZodType): type is ZodTypeLikeVoid => {
  return (
    instanceofZodTypeKind(type, 'void') ||
    instanceofZodTypeKind(type, 'undefined') ||
    instanceofZodTypeKind(type, 'never')
  );
};

const unwrapZodLazy = (type: z.core.$ZodType): z.core.$ZodType => {
  if (instanceofZodTypeKind(type, 'lazy')) {
    return unwrapZodLazy((type as z.ZodLazy).unwrap());
  }
  return type;
};

const unwrapZodOptionalDefault = (
  type: z.core.$ZodType
): {
  description: z.ZodTypeAny['description'];
  defaultValue: unknown;
  isOptional: boolean;
  innerType: z.core.$ZodType;
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
      isOptional = true;
      description = !description ? (innerType as z.ZodOptional).description : description;
      innerType = (innerType as z.ZodOptional).unwrap();
    }
    if (instanceofZodTypeKind(innerType, 'default')) {
      defaultValue = (innerType as z.ZodDefault).def.defaultValue;
      description = !description ? (innerType as z.ZodDefault).description : description;
      innerType = (innerType as z.ZodDefault).unwrap();
    }
  }

  return { description, defaultValue, isOptional, innerType };
};

const unwrapZodType = (type: z.core.$ZodType, unwrapPreprocess: boolean): z.core.$ZodType => {
  if (instanceofZodTypeKind(type, 'lazy')) {
    return unwrapZodType(unwrapZodLazy(type), unwrapPreprocess);
  }

  if (
    instanceofZodTypeKind(type, 'optional') ||
    instanceofZodTypeKind(type, 'default')
  ) {
    const { innerType } = unwrapZodOptionalDefault(type);
    return unwrapZodType(innerType, unwrapPreprocess);
  }

  if (instanceofZodTypeKind(type, 'transform')) {
    return type;
  }
  if (instanceofZodTypeKind(type, 'custom')) {
    return type;
  }
  if (unwrapPreprocess && instanceofZodTypeKind(type, 'pipe')) {
    return unwrapZodType((type as z.ZodPipe).def.out, unwrapPreprocess);
  }
  return type;
};

interface NativeEnumType {
  [k: string]: string | number;
  [nu: number]: string;
}

type ZodTypeLikeString =
  | z.ZodString
  | z.ZodOptional
  | z.ZodDefault
  | z.ZodUnion
  | z.ZodIntersection
  | z.ZodLazy
  | z.ZodLiteral<string>
  | z.ZodEnum<Record<string, string>>;

const zodSupportsCoerce = 'coerce' in z;

type ZodTypeCoercible = z.ZodNumber | z.ZodBoolean | z.ZodBigInt | z.ZodDate;

const instanceofZodTypeCoercible = (_type: z.ZodTypeAny): _type is ZodTypeCoercible => {
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
    return !(type as z.ZodUnion).def.options.some(
      (option) =>
        !instanceofZodTypeLikeString(option, allowMixedUnion) &&
        !(allowMixedUnion && instanceofZodTypeCoercible(option as z.ZodType<any>))
    );
  }

  if (instanceofZodTypeKind(type, 'array')) {
    return instanceofZodTypeLikeString(type, allowMixedUnion);
  }
  if (instanceofZodTypeKind(type, 'intersection')) {
    return (
      instanceofZodTypeLikeString((type as z.ZodIntersection).def.left, allowMixedUnion) &&
      instanceofZodTypeLikeString((type as z.ZodIntersection).def.right, allowMixedUnion)
    );
  }
  if (instanceofZodTypeKind(type, 'literal')) {
    return [...(type as z.ZodLiteral).values].every((value) => typeof value === 'string');
  }
  if (instanceofZodTypeKind(type, 'enum')) {
    return true;
  }
  if (instanceofZodTypeKind(type, 'enum')) {
    return !Object.values((type as z.ZodEnum).enum).some(value => typeof value === 'number')
  }
  return instanceofZodTypeKind(type, 'string');
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
        if (!instanceofZodTypeCoercible(typeWithoutOptionalDefault as z.ZodType<any>)) {
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
    } = convert(typeWithoutOptionalDefault as z.ZodType<any>);

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
  let passThroughShape: z.ZodRawShape = {};
  for (const [key, { optional }] of Object.entries(knownParameters)) {
    passThroughShape = { ...passThroughShape, [key]: optional && !isPathParameter ? z.string().optional() : z.string() };
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

  if (!instanceofZodTypeKind(unwrappedSchema, 'object')) {
    throw createError('Query schema must be an _object_ schema validator!');
  }
  const shape = (unwrappedSchema as z.ZodObject).shape;
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

  if (!instanceofZodTypeKind(unwrappedSchema, 'object')) {
    throw createError('Parameters schema must be an _object_ schema validator!');
  }
  const shape = (unwrappedSchema as z.ZodObject).shape;
  const schemaKeys = Object.keys(shape);
  validatePathParameters(paramKeys, schemaKeys);
  return {
    params: convertObjectMembersToParameterObjects(shape, true),
    shared: {},
  };
};

export const convert = (schema: z.ZodType<any>) => {
  return {
    shared: {},
    schema: z.toJSONSchema(schema, {
      target: 'draft-2020-12',
      // to avoid weird v3 - v4 compatibility issues, temporarily 'draft-2020-12', once
      // zod is upgraded to v4, we can switch back to 'openapi-3.0'
    }) as OpenAPIV3.SchemaObject,
  };
};

export const is = isZod;
