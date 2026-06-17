/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod/v4';

import { getDefType, getObjectOptions, isStrictObject, unwrapSchema } from './utils';

export const SMART_INTERSECTION_MARKER = '@kbn/zod.smartIntersection';

type DistributeIntersection<T, U> = T extends unknown ? T & U : never;

export type SmartIntersectionOutput<
  TBase extends ZodTypeAny,
  TShared extends ZodObject<ZodRawShape>
> = TBase extends ZodObject<ZodRawShape>
  ? z.output<TBase> & z.output<TShared>
  : DistributeIntersection<z.output<TBase>, z.output<TShared>>;

export type SmartIntersectionInput<
  TBase extends ZodTypeAny,
  TShared extends ZodObject<ZodRawShape>
> = TBase extends ZodObject<ZodRawShape>
  ? z.input<TBase> & z.input<TShared>
  : DistributeIntersection<z.input<TBase>, z.input<TShared>>;

export type SmartIntersectionWithOutput<
  TBase extends ZodTypeAny,
  TShape extends ZodRawShape
> = SmartIntersectionOutput<TBase, z.ZodObject<TShape>>;

export type SmartIntersectionWithInput<
  TBase extends ZodTypeAny,
  TShape extends ZodRawShape
> = SmartIntersectionInput<TBase, z.ZodObject<TShape>>;

export interface SmartIntersectionSchema<TOutput = unknown, TInput = TOutput>
  extends z.ZodType<TOutput, TInput> {
  readonly [SMART_INTERSECTION_MARKER]: true;
}

export function isSmartIntersection(schema: unknown): schema is SmartIntersectionSchema {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    SMART_INTERSECTION_MARKER in schema &&
    (schema as SmartIntersectionSchema)[SMART_INTERSECTION_MARKER] === true
  );
}

function assertObjectSchema(schema: ZodTypeAny, label: string): ZodObject<ZodRawShape> {
  const unwrapped = unwrapSchema(schema);
  const defType = getDefType(unwrapped);

  if (defType !== 'object') {
    throw new Error(
      `smartIntersection: ${label} must be an object type, received "${defType ?? 'unknown'}"`
    );
  }

  return schema as ZodObject<ZodRawShape>;
}

function buildSharedObjectSchema(
  sharedShape: ZodRawShape,
  objectOptions: ZodTypeAny[]
): z.ZodObject<ZodRawShape> {
  const sharedSchema = z.object(sharedShape);

  if (objectOptions.every(isStrictObject)) {
    return sharedSchema.strict();
  }

  return sharedSchema;
}

function markSmartIntersection<T extends z.ZodType>(
  schema: T
): SmartIntersectionSchema<z.output<T>, z.input<T>> {
  Object.defineProperty(schema, SMART_INTERSECTION_MARKER, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  return schema as unknown as SmartIntersectionSchema<z.output<T>, z.input<T>>;
}

function smartIntersectionCore<TBase extends ZodTypeAny, TShared extends ZodObject<ZodRawShape>>(
  base: TBase,
  sharedSchema: TShared
): SmartIntersectionSchema<
  SmartIntersectionOutput<TBase, TShared>,
  SmartIntersectionInput<TBase, TShared>
> {
  const objectOptions = getObjectOptions(base);
  const sharedObjectSchema = assertObjectSchema(sharedSchema, 'shared schema');

  if (objectOptions.length === 1) {
    return markSmartIntersection(
      z.intersection(objectOptions[0], sharedObjectSchema)
    ) as SmartIntersectionSchema<
      SmartIntersectionOutput<TBase, TShared>,
      SmartIntersectionInput<TBase, TShared>
    >;
  }

  const schema = z.union(
    objectOptions.map((member) => z.intersection(member, sharedObjectSchema)) as any
  );

  return markSmartIntersection(schema) as SmartIntersectionSchema<
    SmartIntersectionOutput<TBase, TShared>,
    SmartIntersectionInput<TBase, TShared>
  >;
}

/**
 * Intersects an object or every object branch of a union / discriminated union with a shared
 * object schema.
 *
 * For a single object, behaves like `.extend()` but uses intersection internally so
 * `.meta({ id })` refs are preserved in OpenAPI output.
 *
 * For unions, unlike `union.and(z.object(...))`, this validates each branch as a single merged
 * object (so `.strict()` on union members applies correctly) and emits OpenAPI-friendly
 * `anyOf` branches that preserve `$ref`s for members registered with `.meta({ id })`.
 *
 * Nested unions of object types are flattened up to {@link MAX_UNION_OBJECT_NESTING_DEPTH}.
 */
export function smartIntersection<TBase extends ZodTypeAny, TShared extends ZodObject<ZodRawShape>>(
  base: TBase,
  sharedSchema: TShared
): SmartIntersectionSchema<
  SmartIntersectionOutput<TBase, TShared>,
  SmartIntersectionInput<TBase, TShared>
> {
  return smartIntersectionCore(base, sharedSchema);
}

/**
 * Like {@link smartIntersection}, but accepts a raw object shape for the shared properties.
 * Applies `.strict()` to the synthesized shared object when every base branch is strict.
 */
export function smartIntersectionWith<TBase extends ZodTypeAny, TShape extends ZodRawShape>(
  base: TBase,
  sharedShape: TShape
): SmartIntersectionSchema<
  SmartIntersectionWithOutput<TBase, TShape>,
  SmartIntersectionWithInput<TBase, TShape>
> {
  const objectOptions = getObjectOptions(base);
  const sharedSchema = buildSharedObjectSchema(sharedShape, objectOptions);

  return smartIntersectionCore(base, sharedSchema) as SmartIntersectionSchema<
    SmartIntersectionWithOutput<TBase, TShape>,
    SmartIntersectionWithInput<TBase, TShape>
  >;
}
