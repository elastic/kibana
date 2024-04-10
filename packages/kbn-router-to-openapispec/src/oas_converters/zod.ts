/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { z } from '@kbn/zod';
import type { OpenAPIV3 } from 'openapi-types';
import zodToJsonSchema from 'zod-to-json-schema';
import { KnownParameters, OpenAPIConverter } from '../type';
import { validatePathParameters } from './common';

// Adapted from from https://github.com/jlalmes/trpc-openapi/blob/aea45441af785518df35c2bc173ae2ea6271e489/src/utils/zod.ts#L1

const instanceofZodType = (type: any): type is z.ZodTypeAny => {
  return !!type?._def?.typeName;
};

const createError = (message: string): Error => {
  return new Error(`[Zod converter] ${message}`);
};

function assertInstanceOfZodType(schema: unknown): asserts schema is z.ZodTypeAny {
  if (!instanceofZodType(schema)) {
    throw createError('Expected schema to be an instance of Zod');
  }
}

const instanceofZodTypeKind = <Z extends z.ZodFirstPartyTypeKind>(
  type: z.ZodTypeAny,
  zodTypeKind: Z
): type is InstanceType<typeof z[Z]> => {
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

const unwrapZodType = (type: z.ZodTypeAny, unwrapPreprocess: boolean): z.ZodTypeAny => {
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodOptional)) {
    return unwrapZodType(type.unwrap(), unwrapPreprocess);
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodDefault)) {
    return unwrapZodType(type.removeDefault(), unwrapPreprocess);
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodLazy)) {
    return unwrapZodType(type._def.getter(), unwrapPreprocess);
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

const instanceofZodTypeLikeString = (_type: z.ZodTypeAny): _type is ZodTypeLikeString => {
  const type = unwrapZodType(_type, false);

  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodEffects)) {
    if (type._def.effect.type === 'preprocess') {
      return true;
    }
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodUnion)) {
    return !type._def.options.some((option) => !instanceofZodTypeLikeString(option));
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodArray)) {
    return instanceofZodTypeLikeString(type._def.type);
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodIntersection)) {
    return (
      instanceofZodTypeLikeString(type._def.left) && instanceofZodTypeLikeString(type._def.right)
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

const convertObjectMembersToParameterObjects = (
  shape: z.ZodRawShape,
  isRequired: boolean,
  isPathParameter = false,
  knownParameters: KnownParameters = {}
): OpenAPIV3.ParameterObject[] => {
  return Object.entries(shape).map(([shapeKey, subShape]) => {
    const isSubShapeRequired = !subShape.isOptional();

    if (!instanceofZodTypeLikeString(subShape)) {
      if (zodSupportsCoerce) {
        if (!instanceofZodTypeCoercible(subShape)) {
          throw createError(
            `Input parser key: "${shapeKey}" must be ZodString, ZodNumber, ZodBoolean, ZodBigInt or ZodDate`
          );
        }
      } else {
        throw createError(`Input parser key: "${shapeKey}" must be ZodString`);
      }
    }

    const { description, ...openApiSchemaObject } = convert(subShape);

    return {
      name: shapeKey,
      in: isPathParameter ? 'path' : 'query',
      required: isPathParameter ? !knownParameters[shapeKey]?.optional : isSubShapeRequired,
      schema: openApiSchemaObject,
      description,
    };
  });
};

const convertQuery = (schema: unknown): OpenAPIV3.ParameterObject[] => {
  assertInstanceOfZodType(schema);
  const unwrappedSchema = unwrapZodType(schema, true);
  if (!instanceofZodTypeObject(unwrappedSchema)) {
    throw createError('Query schema must be an _object_ schema validator!');
  }
  const shape = unwrappedSchema.shape;
  const isRequired = !schema.isOptional();
  return convertObjectMembersToParameterObjects(shape, isRequired);
};

const convertPathParameters = (
  schema: unknown,
  knownParameters: KnownParameters
): OpenAPIV3.ParameterObject[] => {
  assertInstanceOfZodType(schema);
  const unwrappedSchema = unwrapZodType(schema, true);
  const paramKeys = Object.keys(knownParameters);
  const paramsCount = paramKeys.length;
  if (paramsCount === 0 && instanceofZodTypeLikeVoid(unwrappedSchema)) {
    return [];
  }
  if (!instanceofZodTypeObject(unwrappedSchema)) {
    throw createError('Parameters schema must be an _object_ schema validator!');
  }
  const shape = unwrappedSchema.shape;
  const schemaKeys = Object.keys(shape);
  validatePathParameters(paramKeys, schemaKeys);
  const isRequired = !schema.isOptional();
  return convertObjectMembersToParameterObjects(shape, isRequired, true);
};

const convert = (schema: z.ZodTypeAny): OpenAPIV3.SchemaObject => {
  /* For this PoC we assume that we are able to get JSONSchema from our runtime validation types */
  return zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }) as any;
};

const is = instanceofZodType;

export const zodConverter: OpenAPIConverter = {
  convertPathParameters,
  convertQuery,
  convert,
  is,
};
