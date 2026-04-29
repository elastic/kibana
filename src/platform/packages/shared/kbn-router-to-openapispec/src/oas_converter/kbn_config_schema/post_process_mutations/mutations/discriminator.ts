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

export const processDiscriminator = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  const firstSchema = isReferenceObject(schema.anyOf?.[0])
    ? ctx.derefSharedSchema(schema.anyOf?.[0].$ref)
    : schema.anyOf?.[0];
  if (!firstSchema) return;
  if (!(META_FIELD_X_OAS_DISCRIMINATOR in firstSchema)) return;

  if (!schema.anyOf?.every((entry) => isReferenceObject(entry))) {
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

  const propertyName = firstSchema[
    META_FIELD_X_OAS_DISCRIMINATOR as keyof OpenAPIV3.SchemaObject
  ] as string;

  deleteField(firstSchema, META_FIELD_X_OAS_DISCRIMINATOR);

  schema.oneOf = schema.anyOf;
  deleteField(schema, 'anyOf');

  let catchAllIdx = -1;
  const mapping: Record<string, string> = {};

  ((schema.oneOf ?? []) as OpenAPIV3.ReferenceObject[]).forEach((entry, idx) => {
    const sharedSchema = ctx.derefSharedSchema(entry.$ref);
    if (!sharedSchema)
      throw new Error(
        `Shared schema ${entry.$ref} not found. This is likely a bug in the OAS generator.`
      );
    if (META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE in sharedSchema) {
      catchAllIdx = idx;
      return;
    }

    const discriminatorValue = getDiscriminatorStringValue(sharedSchema, propertyName);

    if (discriminatorValue === undefined) {
      throw new Error(
        dedent`Could not derive OpenAPI discriminator.mapping for discriminated union branch ${
          entry.$ref
        }.

        Each non-default branch must declare "${propertyName}" as a single-string enum (from schema.literal) so the OAS generator can build discriminator.mapping.

        Debug details: ${JSON.stringify(sharedSchema.properties?.[propertyName])}.`
      );
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
