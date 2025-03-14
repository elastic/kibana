/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Schema,
  z,
  ZodAny,
  ZodEffects,
  ZodFirstPartySchemaTypes,
  ZodFirstPartyTypeKind,
  ZodIssueCode,
  ZodTypeAny,
} from '@kbn/zod';
import { difference, isPlainObject, forEach, isArray, castArray } from 'lodash';

/**
 * These types are not unpackable, they mark a property as handled,
 * but any nested keys will result in runtime failures
 */
const primitiveTypes = [
  ZodFirstPartyTypeKind.ZodString,
  ZodFirstPartyTypeKind.ZodBoolean,
  ZodFirstPartyTypeKind.ZodNull,
  ZodFirstPartyTypeKind.ZodUndefined,
  ZodFirstPartyTypeKind.ZodNumber,
  ZodFirstPartyTypeKind.ZodNaN,
  ZodFirstPartyTypeKind.ZodLiteral,
  ZodFirstPartyTypeKind.ZodEnum,
  ZodFirstPartyTypeKind.ZodNativeEnum,
] as const;

/**
 * any() and unknown() will result in warnings,
 * as we don't really know what to do with them
 * and they can lead to unexpected behavior at
 * runtime, such as failing on excess keys for
 * objects
 */
const dangerousTypes = [ZodFirstPartyTypeKind.ZodAny, ZodFirstPartyTypeKind.ZodUnknown] as const;

const typeNames = [
  ZodFirstPartyTypeKind.ZodObject,
  ZodFirstPartyTypeKind.ZodArray,
  ZodFirstPartyTypeKind.ZodUnion,
  ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
  ZodFirstPartyTypeKind.ZodIntersection,
  ZodFirstPartyTypeKind.ZodOptional,
  ZodFirstPartyTypeKind.ZodEffects,
  ZodFirstPartyTypeKind.ZodRecord,
  ZodFirstPartyTypeKind.ZodDefault,
  ZodFirstPartyTypeKind.ZodLazy,
  ZodFirstPartyTypeKind.ZodNullable,
  ...primitiveTypes,
  ...dangerousTypes,
] as const;

type ParsableType = (typeof typeNames)[number];

type PrimitiveParsableType = (typeof primitiveTypes)[number];
type DangerousParsableType = (typeof dangerousTypes)[number];

type ParsableSchema = Extract<ZodFirstPartySchemaTypes, { _def: { typeName: ParsableType } }>;
type PrimitiveParsableSchema = Extract<
  ZodFirstPartySchemaTypes,
  { _def: { typeName: PrimitiveParsableType } }
>;

type DangerousParsableSchema =
  | Extract<ZodFirstPartySchemaTypes, { _def: { typeName: DangerousParsableType } }>
  | ZodEffects<ZodTypeAny>;

function getTypeName(schema: z.Schema): string | undefined {
  const typeName =
    'typeName' in schema._def && typeof schema._def.typeName === 'string'
      ? schema._def.typeName
      : undefined;

  return typeName;
}

function isParsableSchema(schema: z.Schema): schema is ParsableSchema {
  const typeName = getTypeName(schema);
  return !!typeName && typeNames.includes(typeName as ParsableType);
}

function assertIsParsableSchema(schema: z.Schema, key: string): asserts schema is ParsableSchema {
  if (isParsableSchema(schema)) {
    return;
  }

  throw new Error(
    `Unsupported schema at ${key}: ${
      'typeName' in schema._def ? schema._def.typeName : 'unknown type'
    }`
  );
}

function isPrimitiveParsableSchema(schema: z.Schema): schema is PrimitiveParsableSchema {
  const typeName = getTypeName(schema);
  return !!typeName && primitiveTypes.includes(typeName as PrimitiveParsableType);
}

function isDangerousParsableSchema(
  schema: z.Schema
): schema is Exclude<DangerousParsableSchema, ZodEffects<z.ZodAny>> {
  const typeName = getTypeName(schema);
  return !!typeName && dangerousTypes.includes(typeName as DangerousParsableType);
}
/**
 * Asserts that the schema is recursively parsable (ie, it is
 * composed entirely of parsable schemas)
 */
export function assertAllParsableSchemas(
  outerSchema: z.Schema
): Set<{ key: string; schema: DangerousParsableSchema }> {
  // track processed schemas, to prevent self-referencing schemas
  // instantiated with z.lazy() to create recursion errors
  const processed: Set<Schema> = new Set();
  // track dangerous schemas and their path
  const dangerous: Set<{ key: string; schema: DangerousParsableSchema }> = new Set();

  innerAssertAllParsableSchemas(outerSchema, '');

  return dangerous;

  function innerAssertAllParsableSchemas(schema: z.Schema, key: string): void {
    assertIsParsableSchema(schema, key);

    if (processed.has(schema)) {
      return;
    }

    processed.add(schema);

    if (isPrimitiveParsableSchema(schema)) {
      return;
    }

    if (isDangerousParsableSchema(schema)) {
      dangerous.add({ key, schema });
      return;
    }

    const def = schema._def;

    switch (def.typeName) {
      case ZodFirstPartyTypeKind.ZodObject:
        return Object.entries(def.shape()).forEach(([prop, innerSchema]) =>
          innerAssertAllParsableSchemas(innerSchema as z.Schema, key ? `${key}.${prop}` : prop)
        );
      case ZodFirstPartyTypeKind.ZodOptional:
        return innerAssertAllParsableSchemas(def.innerType, key);
      case ZodFirstPartyTypeKind.ZodArray:
        return innerAssertAllParsableSchemas(def.type, key);

      case ZodFirstPartyTypeKind.ZodUnion:
      case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
        const schemas: z.Schema[] = def.options;
        return schemas.forEach((innerSchema) => innerAssertAllParsableSchemas(innerSchema, key));

      case z.ZodFirstPartyTypeKind.ZodIntersection:
        innerAssertAllParsableSchemas(def.left, key);
        innerAssertAllParsableSchemas(def.right, key);
        return;

      case z.ZodFirstPartyTypeKind.ZodEffects:
        if (def.effect.type === 'transform') {
          dangerous.add({ key, schema: schema as ZodEffects<ZodAny> });
        }
        return innerAssertAllParsableSchemas(def.schema, key);

      case z.ZodFirstPartyTypeKind.ZodRecord:
        return innerAssertAllParsableSchemas(def.valueType, key);

      case ZodFirstPartyTypeKind.ZodDefault:
        return innerAssertAllParsableSchemas(def.innerType, key);

      case ZodFirstPartyTypeKind.ZodLazy:
        return innerAssertAllParsableSchemas(def.getter(), key);

      case ZodFirstPartyTypeKind.ZodNullable:
        return innerAssertAllParsableSchemas(def.innerType, key);
    }
  }
}

function getHandlingSchemas(schema: z.Schema, key: string, value: object): z.Schema[] {
  assertIsParsableSchema(schema, key);

  if (isPrimitiveParsableSchema(schema) || isDangerousParsableSchema(schema)) {
    return [];
  }

  const def = schema._def;

  switch (def.typeName) {
    case ZodFirstPartyTypeKind.ZodObject:
      return [def.shape()[key] as z.Schema];
    case ZodFirstPartyTypeKind.ZodOptional:
      return getHandlingSchemas(def.innerType, key, value);
    case ZodFirstPartyTypeKind.ZodArray:
      return [def.type as z.Schema];

    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      const types: z.Schema[] = def.options;
      // for union types, we should only return the first matching union type
      // to make sure unmatching union types don't mark a key as handled
      const matched = types.find((type) => type.safeParse(value).success);
      return matched ? getHandlingSchemas(matched, key, value) : [];

    case z.ZodFirstPartyTypeKind.ZodIntersection:
      return [
        ...getHandlingSchemas(def.left, key, value),
        ...getHandlingSchemas(def.right, key, value),
      ];

    case z.ZodFirstPartyTypeKind.ZodEffects:
      return [def.schema];

    case z.ZodFirstPartyTypeKind.ZodRecord:
      return [def.valueType];

    case ZodFirstPartyTypeKind.ZodDefault:
      return [def.innerType];

    case ZodFirstPartyTypeKind.ZodLazy:
      return [def.getter()];

    case ZodFirstPartyTypeKind.ZodNullable:
      return [def.innerType];
  }
}

function getHandledKeys<T extends Record<string, unknown>>(
  type: z.Schema,
  object: T,
  prefix: string = ''
): { handled: Set<string>; all: Set<string> } {
  const keys: {
    handled: Set<string>;
    all: Set<string>;
  } = {
    handled: new Set(),
    all: new Set(),
  };

  forEach(object, (value, key) => {
    const ownPrefix = prefix ? `${prefix}.${key}` : key;
    keys.all.add(ownPrefix);

    const handlingTypes = getHandlingSchemas(type, key, object).filter(Boolean);

    if (handlingTypes.length) {
      keys.handled.add(ownPrefix);
    }

    const processObject = (typeForObject: z.Schema, objectToProcess: Record<string, unknown>) => {
      const nextKeys = getHandledKeys(typeForObject, objectToProcess, ownPrefix);
      nextKeys.all.forEach((k) => keys.all.add(k));
      nextKeys.handled.forEach((k) => keys.handled.add(k));
    };

    if (isPlainObject(value)) {
      handlingTypes.forEach((typeAtIndex) => {
        processObject(typeAtIndex, value as Record<string, unknown>);
      });
    }

    if (isArray(value)) {
      handlingTypes.forEach((typeAtIndex) => {
        if (
          !isParsableSchema(typeAtIndex) ||
          typeAtIndex._def.typeName !== ZodFirstPartyTypeKind.ZodArray
        ) {
          return;
        }

        const innerType = typeAtIndex._def.type;

        castArray(value).forEach((valueAtIndex) => {
          if (isPlainObject(valueAtIndex)) {
            processObject(innerType, valueAtIndex as Record<string, unknown>);
          }
        });
      });
    }
  });

  return keys;
}

export function DeepStrict<TSchema extends z.Schema>(schema: TSchema) {
  assertAllParsableSchemas(schema);

  /**
   * We use preprocess and not superRefine because unknown keys are
   * stripped before the latter is called, meaning we can no longer
   * validate. There is a catch here: if any types do any transformation,
   * we might match the wrong union type.
   */
  return z.preprocess((value, context) => {
    const keys = getHandledKeys(schema, value as Record<string, unknown>);

    const excessKeys = difference([...keys.all], [...keys.handled]);

    if (excessKeys.length) {
      context.addIssue({
        code: ZodIssueCode.unrecognized_keys,
        keys: excessKeys,
        message: `Excess keys are not allowed`,
      });
    }
    return value;
  }, schema);
}
