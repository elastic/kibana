/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import { isConfigSchema, metaFields } from '@kbn/config-schema';
import type { z } from '@kbn/zod';
import { isZod, z as zodV4 } from '@kbn/zod';
import type { OpenAPIV3 } from 'openapi-types';

import type { ConvertOptions, KnownParameters } from '../../type';
import { collapseArrayUnion } from '../collapse_array_union';
import { validatePathParameters } from '../common';
import { convert as zodConvert, unwrapZodType } from '../zod/lib';

const createError = (message: string) => {
  return new Error(`[@kbn/config-schema converter] ${message}`);
};

function assertInstanceOfKbnConfigSchema(schema: unknown): asserts schema is Type<any> {
  if (!is(schema)) {
    throw createError('Expected schema to be an instance of @kbn/config-schema');
  }
}

export const unwrapKbnConfigSchema = (schema: unknown): z.ZodTypeAny => {
  assertInstanceOfKbnConfigSchema(schema);
  const inner = zodSchemaFromKbnType(schema);
  if (!isZod(inner)) {
    throw createError('Expected @kbn/config-schema Type to wrap a Zod schema');
  }
  return inner;
};

function getZodDefType(s: z.ZodTypeAny): string | undefined {
  return (s as { _zod?: { def?: { type?: string } } })._zod?.def?.type;
}

function getZodRegistryMeta(s: z.ZodTypeAny): Record<string, unknown> {
  return (zodV4.globalRegistry.get(s as z.ZodTypeAny) ?? {}) as Record<string, unknown>;
}

function shouldExcludeFromOasLikeLegacyJoi(inner: z.ZodTypeAny): boolean {
  const u = unwrapZodType(inner, true);
  const def = (u as { _zod?: { def?: { type?: string; shape?: object; catchall?: unknown } } })._zod
    ?.def;

  if (def?.type === 'any') {
    const reg = getZodRegistryMeta(u);
    if (reg[metaFields.META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES]) {
      return false;
    }
    return true;
  }

  if (def?.type === 'never') {
    return true;
  }

  if (def?.type === 'object' && def.shape && Object.keys(def.shape).length === 0 && def.catchall) {
    return getZodDefType(def.catchall as z.ZodTypeAny) === 'unknown';
  }

  return false;
}

export const getParamSchema = (knownParameters: KnownParameters, schemaKey: string) => {
  return (
    knownParameters[schemaKey] ??
    knownParameters[schemaKey + '*'] ??
    knownParameters[schemaKey + '?*']
  );
};

function branchIsNullLike(o: z.ZodTypeAny): boolean {
  const t = getZodDefType(o);
  if (t === 'null') {
    return true;
  }
  if (t === 'literal') {
    const d = (o as { _zod?: { def?: { value?: unknown; values?: unknown[] } } })._zod?.def;
    if (d?.value === null) {
      return true;
    }
    return Array.isArray(d?.values) && (d!.values as unknown[]).includes(null);
  }
  return false;
}

export function isNullableObjectType(schema: unknown): boolean {
  let zodLike: unknown = schema;
  if (isConfigSchema(schema)) {
    zodLike = zodSchemaFromKbnType(schema as Type<any>);
  }
  if (!isZod(zodLike)) {
    return false;
  }
  const u = unwrapZodType(zodLike as z.ZodTypeAny, true);
  const def = (u as { _zod?: { def?: { type?: string; options?: z.ZodTypeAny[] } } })._zod?.def;
  if (def?.type !== 'union' || !Array.isArray(def.options)) {
    return false;
  }
  const branches = def.options as z.ZodTypeAny[];
  const hasNull = branches.some((o) => branchIsNullLike(unwrapZodType(o, true)));
  const hasObject = branches.some((o) => getZodDefType(unwrapZodType(o, true)) === 'object');
  return hasNull && hasObject;
}

export function zodSchemaFromKbnType(schema: Type<any>): z.ZodTypeAny {
  return schema.getInternalSchema();
}

function unwrapNullableObjectUnionForParams(inner: z.ZodTypeAny): z.ZodTypeAny {
  const u = unwrapZodType(inner, true);
  const def = (u as { _zod?: { def?: { type?: string; options?: z.ZodTypeAny[] } } })._zod?.def;
  if (def?.type === 'union' && Array.isArray(def.options)) {
    const objBranch = def.options
      .map((o) => unwrapZodType(o as z.ZodTypeAny, true))
      .find((o) => getZodDefType(o) === 'object');
    if (objBranch) {
      return objBranch;
    }
  }
  return u;
}

function assertRouteParamsSchemaHasNoMetaId(unwrapped: z.ZodTypeAny): void {
  const surface = unwrapZodType(unwrapped, true);
  if (getZodDefType(surface) !== 'object') {
    return;
  }
  const meta = getZodRegistryMeta(surface);
  const id = meta.id;
  if (typeof id === 'string' && id.length > 0) {
    throw createError(
      `${id} references are not supported for OpenAPI path/query parameter extraction`
    );
  }
}

function optionalizeObjectShape(obj: z.ZodObject<any>): z.ZodObject<any> {
  const shape = obj.shape as z.ZodRawShape;
  let result = obj;
  for (const key of Object.keys(shape)) {
    result = result.extend({ [key]: (shape[key] as z.ZodTypeAny).optional() } as z.ZodRawShape);
  }
  return result;
}

export const convert = (kbnConfigSchema: unknown, opts?: ConvertOptions) => {
  const inner = unwrapKbnConfigSchema(kbnConfigSchema);
  const surface = unwrapZodType(inner, true);
  const defType = getZodDefType(surface);

  if (defType !== 'object' && defType !== 'union' && defType !== 'intersection') {
    const wrapped = zodV4.object({ value: inner });
    const converted = zodConvert(wrapped, opts);
    if ('$ref' in converted.schema) {
      return converted;
    }
    const valueSchema = converted.schema.properties?.value as OpenAPIV3.SchemaObject | undefined;
    if (valueSchema) {
      return {
        schema: valueSchema,
        shared: converted.shared,
      };
    }
  }

  return zodConvert(inner, opts);
};

export const convertQuery = (kbnConfigSchema: unknown, opts?: ConvertOptions) => {
  const rawInner = unwrapKbnConfigSchema(kbnConfigSchema);
  let inner = unwrapNullableObjectUnionForParams(rawInner);
  let nullableObject = false;
  if (isNullableObjectType(rawInner)) {
    nullableObject = true;
    const surface = unwrapZodType(inner, true);
    if (getZodDefType(surface) === 'object') {
      inner = optionalizeObjectShape(surface as z.ZodObject<any>);
    }
  }
  assertRouteParamsSchemaHasNoMetaId(inner);
  const converted = zodConvert(inner, opts);
  if (
    '$ref' in converted.schema ||
    converted.schema.type !== 'object' ||
    !converted.schema.properties
  ) {
    throw createError('Query schema must be an _object_ schema validator!');
  }

  const required = new Set(converted.schema.required ?? []);
  const query = Object.entries(converted.schema.properties).map(([name, value]) => {
    const schema = collapseArrayUnion(value as OpenAPIV3.SchemaObject);
    return {
      name,
      in: 'query' as const,
      required: nullableObject ? false : required.has(name),
      schema,
      description: !('$ref' in schema) ? schema.description : undefined,
    };
  });

  return { query, shared: converted.shared };
};

export const convertPathParameters = (
  kbnConfigSchema: unknown,
  knownParameters: KnownParameters,
  opts?: ConvertOptions
) => {
  const inner = unwrapNullableObjectUnionForParams(unwrapKbnConfigSchema(kbnConfigSchema));
  assertRouteParamsSchemaHasNoMetaId(inner);
  const converted = zodConvert(inner, opts);
  if (
    '$ref' in converted.schema ||
    converted.schema.type !== 'object' ||
    !converted.schema.properties
  ) {
    throw createError('Parameters schema must be an _object_ schema validator!');
  }

  const schemaKeys = Object.keys(converted.schema.properties);
  validatePathParameters(Object.keys(knownParameters), schemaKeys);

  const params = schemaKeys.map((name) => {
    const schema = converted.schema.properties![name] as
      | OpenAPIV3.SchemaObject
      | OpenAPIV3.ReferenceObject;
    return {
      name,
      in: 'path' as const,
      required: true,
      schema,
      description: !('$ref' in schema) ? schema.description : undefined,
    };
  });

  return { params, shared: converted.shared };
};

export const is = (schema: unknown): boolean => {
  if (!isConfigSchema(schema)) {
    return false;
  }
  const typeInstance = schema as Type<any>;
  const inner = zodSchemaFromKbnType(typeInstance);
  if (!isZod(inner)) {
    return false;
  }
  let structural = unwrapZodType(inner, true);
  const barePlaceholderAny =
    getZodDefType(structural) === 'any' &&
    !getZodRegistryMeta(structural)[metaFields.META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES];
  if (barePlaceholderAny) {
    structural = unwrapZodType(typeInstance.getSchema() as z.ZodTypeAny, true);
  }
  if (shouldExcludeFromOasLikeLegacyJoi(structural)) {
    return false;
  }
  return true;
};
