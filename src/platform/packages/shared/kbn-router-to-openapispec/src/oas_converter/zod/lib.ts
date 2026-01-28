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

import { toJSONSchema } from './zod-to-json-schema-polyfill';
import { validatePathParameters } from '../common';

// Adapted from from https://github.com/jlalmes/trpc-openapi/blob/aea45441af785518df35c2bc173ae2ea6271e489/src/utils/zod.ts#L1

const createError = (message: string): Error => {
  return new Error(`[Zod converter] ${message}`);
};

// version-agnostic get def
function getDef(schema: any): any {
  return schema?._zod?.def ?? schema?.def ?? schema?._def ?? {};
}

function assertInstanceOfZodType(schema: unknown): asserts schema is z.ZodTypeAny {
  if (!isZod(schema)) {
    throw createError('Expected schema to be an instance of Zod');
  }
}

const instanceofZodTypeKind = (
  type: z.ZodTypeAny | z.core.$ZodType,
  zodTypeKind: z.core.$ZodTypeDef['type']
) => {
  // Zod v4 classic API case
  if ('def' in type && type.def && typeof type.def === 'object' && 'type' in type.def) {
    return type.def.type === zodTypeKind;
  }
  // Zod v4 core API case
  if ('_zod' in type && type._zod?.def) {
    return type._zod.def.type === zodTypeKind;
  }
  // zod v3 case, remove after upgrade to v4
  if ('_def' in type && type._def && typeof type._def === 'object' && 'typeName' in type._def) {
    const v3Def = type._def as any;
    // accomodates for v3's zodeffects, which is not supported in v4
    if (v3Def.typeName === 'ZodEffects') {
      const effectType = v3Def.effect?.type;
      if (zodTypeKind === 'transform' && effectType === 'transform') {
        return true;
      }
      if (zodTypeKind === 'pipe' && effectType === 'preprocess') {
        return true;
      }
      return false;
    }
    const v3TypeName = 'Zod' + zodTypeKind.charAt(0).toUpperCase() + zodTypeKind.slice(1);
    return v3Def.typeName === v3TypeName;
  }
  return false;
};

type ZodTypeLikeVoid = z.ZodVoid | z.ZodUndefined | z.ZodNever;

const instanceofZodTypeLikeVoid = (
  type: z.ZodTypeAny | z.core.$ZodType
): type is ZodTypeLikeVoid => {
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
      defaultValue = getDef(innerType).defaultValue;
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

  if (instanceofZodTypeKind(type, 'optional') || instanceofZodTypeKind(type, 'default')) {
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
    // v4: def.out, v3 (ZodEffects): schema
    const pipeOut = getDef(type).out ?? getDef(type).schema;
    if (pipeOut) {
      return unwrapZodType(pipeOut, unwrapPreprocess);
    }
  }
  return type;
};

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

  // Accept pipe (v4) and transform (v3/v4) as valid for parameters since the input type is string-like
  if (instanceofZodTypeKind(type, 'pipe') || instanceofZodTypeKind(type, 'transform')) {
    return true;
  }

  if (instanceofZodTypeKind(type, 'union')) {
    const options = getDef(type).options ?? [];
    return !options.some(
      (option: any) =>
        !instanceofZodTypeLikeString(option, allowMixedUnion) &&
        !(allowMixedUnion && instanceofZodTypeCoercible(option as z.ZodType<any>))
    );
  }

  if (instanceofZodTypeKind(type, 'array')) {
    const elementType = getDef(type).element ?? getDef(type).type;
    if (elementType) {
      return instanceofZodTypeLikeString(elementType, allowMixedUnion);
    }
    return false;
  }
  if (instanceofZodTypeKind(type, 'intersection')) {
    const def = getDef(type);
    return (
      instanceofZodTypeLikeString(def.left, allowMixedUnion) &&
      instanceofZodTypeLikeString(def.right, allowMixedUnion)
    );
  }
  if (instanceofZodTypeKind(type, 'literal')) {
    return [...(type as z.ZodLiteral).values].every((value) => typeof value === 'string');
  }
  if (instanceofZodTypeKind(type, 'enum')) {
    return true;
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
    passThroughShape = {
      ...passThroughShape,
      [key]: optional && !isPathParameter ? z.string().optional() : z.string(),
    };
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
    schema: toJSONSchema(schema, {
      target: 'openapi-3.0',
      unrepresentable: 'any',
    }) as OpenAPIV3.SchemaObject,
  };
};

export const is = isZod;
