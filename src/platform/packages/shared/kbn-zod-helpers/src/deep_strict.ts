/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Schema, z, ZodFirstPartySchemaTypes, ZodFirstPartyTypeKind, ZodIssueCode } from '@kbn/zod';
import { difference, isPlainObject, forEach, isArray, castArray } from 'lodash';

/*
  Type that tracks validated keys, and fails when the input value
  has keys that have not been validated.
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
  ZodFirstPartyTypeKind.ZodUnknown,
] as const;

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
  ...primitiveTypes,
] as const;

type ParsableType = (typeof typeNames)[number];

type PrimitiveParsableType = (typeof primitiveTypes)[number];

type ParsableSchema = Extract<ZodFirstPartySchemaTypes, { _def: { typeName: ParsableType } }>;
type PrimitiveParsableSchema = Extract<
  ZodFirstPartySchemaTypes,
  { _def: { typeName: PrimitiveParsableType } }
>;

function isParsableSchema(schema: z.Schema): schema is ParsableSchema {
  const typeName =
    'typeName' in schema._def && typeof schema._def.typeName === 'string'
      ? schema._def.typeName
      : undefined;

  return typeNames.includes(typeName as ParsableType);
}
function assertIsParsableSchema(schema: z.Schema): asserts schema is ParsableSchema {
  if (isParsableSchema(schema)) {
    return;
  }

  throw new Error(
    'Unsupported schema: ' + ('typeName' in schema._def ? schema._def.typeName : 'unknown type')
  );
}

function isPrimitiveParsableSchema(schema: z.Schema): schema is PrimitiveParsableSchema {
  if ('typeName' in schema._def && typeof schema._def.typeName === 'string') {
    return primitiveTypes.includes(schema._def.typeName as PrimitiveParsableType);
  }
  return false;
}

function validateSchemas(outerSchema: z.Schema): void {
  const processed: Set<Schema> = new Set();

  assertKnownSchemas(outerSchema);

  function assertKnownSchemas(schema: z.Schema): void {
    assertIsParsableSchema(schema);

    if (processed.has(schema)) {
      return;
    }

    processed.add(schema);

    if (isPrimitiveParsableSchema(schema)) {
      return;
    }

    const def = schema._def;

    switch (def.typeName) {
      case ZodFirstPartyTypeKind.ZodObject:
        return Object.values(def.shape()).forEach((innerSchema) =>
          assertKnownSchemas(innerSchema as z.Schema)
        );
      case ZodFirstPartyTypeKind.ZodOptional:
        return assertKnownSchemas(def.innerType);
      case ZodFirstPartyTypeKind.ZodArray:
        return assertKnownSchemas(def.type);

      case ZodFirstPartyTypeKind.ZodUnion:
      case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
        const schemas: z.Schema[] = def.options;
        return schemas.forEach((innerSchema) => assertKnownSchemas(innerSchema));

      case z.ZodFirstPartyTypeKind.ZodIntersection:
        assertKnownSchemas(def.left);
        assertKnownSchemas(def.right);
        return;

      case z.ZodFirstPartyTypeKind.ZodEffects:
        return assertKnownSchemas(def.schema);

      case z.ZodFirstPartyTypeKind.ZodRecord:
        return assertKnownSchemas(def.valueType);

      case ZodFirstPartyTypeKind.ZodDefault:
        return assertKnownSchemas(def.innerType);

      case ZodFirstPartyTypeKind.ZodLazy:
        return assertKnownSchemas(def.getter());
    }
  }
}

function getHandlingSchemas(schema: z.Schema, key: string, value: object): z.Schema[] {
  assertIsParsableSchema(schema);

  if (isPrimitiveParsableSchema(schema)) {
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
  validateSchemas(schema);

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
