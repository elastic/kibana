/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metaFields } from '@kbn/config-schema';
import dedent from 'dedent';
import type { OpenAPIV3 } from 'openapi-types';
import { deleteField } from './utils';
import type { IContext } from '../context';
import { isReferenceObject } from '../../../common';

const { META_FIELD_X_OAS_DISCRIMINATOR, META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE } = metaFields;

const getDiscriminatorStringValue = (
  sharedSchema: OpenAPIV3.SchemaObject,
  propertyName: string
): string | undefined => {
  const rawProp = sharedSchema.properties?.[propertyName];
  if (!rawProp || typeof rawProp !== 'object') {
    return undefined;
  }
  if ('$ref' in rawProp) {
    return undefined;
  }
  const propSchema = rawProp as OpenAPIV3.SchemaObject;
  if (Array.isArray(propSchema.enum) && propSchema.enum.length === 1) {
    const [only] = propSchema.enum;
    return typeof only === 'string' ? only : undefined;
  }
  if ('const' in propSchema && typeof propSchema.const === 'string') {
    return propSchema.const;
  }
  return undefined;
};

const inferDiscriminatorPropertyName = (schemas: OpenAPIV3.SchemaObject[]): string | undefined => {
  const keys = new Set<string>();
  schemas.forEach((schema) => Object.keys(schema.properties ?? {}).forEach((k) => keys.add(k)));

  for (const key of keys) {
    const values = schemas.map((schema) => getDiscriminatorStringValue(schema, key));
    const literalCount = values.filter((v): v is string => typeof v === 'string').length;
    if (literalCount >= 2) {
      return key;
    }
  }
  return undefined;
};

export const processDiscriminator = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  const variants = schema.oneOf ?? schema.anyOf;
  const firstSchema = isReferenceObject(variants?.[0])
    ? ctx.derefSharedSchema(variants?.[0].$ref)
    : variants?.[0];
  if (!firstSchema) return;

  const propertyNameFromMeta = firstSchema[
    META_FIELD_X_OAS_DISCRIMINATOR as keyof OpenAPIV3.SchemaObject
  ] as string;
  const hasMetadata = Boolean(propertyNameFromMeta);

  if (!variants?.every((entry) => isReferenceObject(entry))) {
    if (!hasMetadata) {
      return;
    }
    throw new Error(
      dedent`When using schema.discriminator ensure that every entry schema has an ID.

      IDs must be short and **globally** unique to your schema instance. Consider a common post-fix to guarantee uniqueness like: "my-schema-my-team" (no '.' are allowed in IDs)

      For example:

      schema.discriminatedUnion('type', [
        schema.object(
          { type: schema.literal('str'), value: schema.string() },
          { meta: { id: 'my-str-my-team' } }
        ),
        schema.object(
          { type: schema.literal('num'), value: schema.number() },
          { meta: { id: 'my-num-my-team' } }
        ),
      ]),

      Otherwise we cannot generate OAS for this schema.

      Debug details: expected reference object, got ${JSON.stringify(schema)}.`
    );
  }

  const sharedSchemas = variants
    .map((entry) => ctx.derefSharedSchema((entry as OpenAPIV3.ReferenceObject).$ref))
    .filter((s): s is OpenAPIV3.SchemaObject => s !== undefined);
  const propertyName = propertyNameFromMeta || inferDiscriminatorPropertyName(sharedSchemas);
  if (!propertyName) {
    return;
  }

  deleteField(firstSchema, META_FIELD_X_OAS_DISCRIMINATOR);

  schema.oneOf = variants;
  deleteField(schema, 'anyOf');

  let catchAllIdx = -1;
  const mapping: Record<string, string> = {};

  ((schema.oneOf ?? []) as OpenAPIV3.ReferenceObject[]).forEach((entry, idx) => {
    const sharedSchema = ctx.derefSharedSchema(entry.$ref);
    if (!sharedSchema)
      throw new Error(
        `Shared schema ${entry.$ref} not found. This is likely a bug in the OAS generator.`
      );
    const discriminatorValue = getDiscriminatorStringValue(sharedSchema, propertyName);
    if (
      META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE in sharedSchema ||
      discriminatorValue === undefined
    ) {
      if (!(META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE in sharedSchema)) {
        (sharedSchema as Record<string, unknown>)[META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE] =
          true;
      }
      catchAllIdx = idx;
      return;
    }

    if (discriminatorValue in mapping) {
      throw new Error(
        `Duplicate discriminator value "${discriminatorValue}" when generating mapping for ${entry.$ref}.`
      );
    }
    mapping[discriminatorValue] = entry.$ref;
  });

  if (catchAllIdx > -1) {
    schema.oneOf?.splice(catchAllIdx, 1);
  }

  schema.discriminator =
    Object.keys(mapping).length > 0 ? { propertyName, mapping } : { propertyName };
};
