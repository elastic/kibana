/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod/v4';

export const MAX_UNION_OBJECT_NESTING_DEPTH = 5;

/**
 * Minimal view of Zod v4 internal defs used by smartIntersection utilities.
 * These fields exist at runtime but are not exposed on the public `$ZodTypeDef` type.
 */
interface ZodInternalDef {
  type: string;
  getter?: () => ZodTypeAny;
  innerType?: ZodTypeAny;
  in?: ZodTypeAny;
  out?: ZodTypeAny;
  catchall?: ZodTypeAny;
  options?: ZodTypeAny[];
}

function getInternalDef(schema: ZodTypeAny): ZodInternalDef {
  return schema._zod.def as ZodInternalDef;
}

export function getDefType(schema: ZodTypeAny): string | undefined {
  return getInternalDef(schema)?.type;
}

export function unwrapSchema(schema: ZodTypeAny): ZodTypeAny {
  let innerType = schema;

  while (true) {
    const def = getInternalDef(innerType);
    const defType = def.type;

    if (defType === 'lazy') {
      innerType = def.getter!();
      continue;
    }

    if (defType === 'optional' || defType === 'default') {
      innerType = def.innerType!;
      continue;
    }

    if (defType === 'pipe') {
      const pipeIn = def.in!;
      const pipeOut = def.out!;
      innerType = getDefType(pipeOut) === 'transform' ? pipeIn : pipeOut;
      continue;
    }

    break;
  }

  return innerType;
}

export function isStrictObject(schema: ZodTypeAny): schema is ZodObject<ZodRawShape> {
  const unwrapped = unwrapSchema(schema);
  const def = getInternalDef(unwrapped);

  const catchall = def.catchall;

  return (
    def.type === 'object' && catchall !== undefined && getInternalDef(catchall).type === 'never'
  );
}

export function flattenUnionObjectOptions(
  schema: ZodTypeAny,
  depth = 0,
  path = 'union'
): ZodObject<ZodRawShape>[] {
  if (depth > MAX_UNION_OBJECT_NESTING_DEPTH) {
    throw new Error(
      `smartIntersection: nested object unions exceed maximum depth of ${MAX_UNION_OBJECT_NESTING_DEPTH} at "${path}"`
    );
  }

  const unwrapped = unwrapSchema(schema);
  const defType = getDefType(unwrapped);

  if (defType !== 'union') {
    throw new Error(
      `smartIntersection: expected a union of object types, received "${defType ?? 'unknown'}"`
    );
  }

  const options: ZodTypeAny[] = getInternalDef(unwrapped).options!;
  const objectOptions: ZodObject<ZodRawShape>[] = [];

  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    const unwrappedOption = unwrapSchema(option);
    const optionType = getDefType(unwrappedOption);
    const optionPath = `${path}.options[${index}]`;

    if (optionType === 'object') {
      objectOptions.push(option as ZodObject<ZodRawShape>);
      continue;
    }

    if (optionType === 'union') {
      objectOptions.push(...flattenUnionObjectOptions(option, depth + 1, optionPath));
      continue;
    }

    throw new Error(
      `smartIntersection: union option must be an object type or nested union of object types, received "${
        optionType ?? 'unknown'
      }" at "${optionPath}"`
    );
  }

  if (objectOptions.length === 0) {
    throw new Error(`smartIntersection: union must contain at least one object type at "${path}"`);
  }

  return objectOptions;
}

/**
 * Resolves a base schema to the object branches that will be extended.
 * Accepts a single object, a union of objects, or a discriminated union of objects.
 */
export function getObjectOptions(schema: ZodTypeAny, path = 'base'): ZodObject<ZodRawShape>[] {
  const unwrapped = unwrapSchema(schema);
  const defType = getDefType(unwrapped);

  if (defType === 'object') {
    return [schema as ZodObject<ZodRawShape>];
  }

  if (defType === 'union') {
    return flattenUnionObjectOptions(schema, 0, path);
  }

  throw new Error(
    `smartIntersection: expected an object or union of object types, received "${
      defType ?? 'unknown'
    }"`
  );
}
