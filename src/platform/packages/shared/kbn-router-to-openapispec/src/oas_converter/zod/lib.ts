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

export const convert = (schema: z.ZodTypeAny) => {
  return {
    shared: {},
    schema: zodToJsonSchema(schema, {
      target: 'openApi3',
      $refStrategy: 'none',
      postProcess: jsonDescription,
    }) as OpenAPIV3.SchemaObject,
  };
};

export const is = isZod;
