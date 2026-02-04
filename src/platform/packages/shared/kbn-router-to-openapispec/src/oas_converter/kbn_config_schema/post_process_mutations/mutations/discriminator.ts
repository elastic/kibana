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

  schema.discriminator = { propertyName };
  deleteField(firstSchema, META_FIELD_X_OAS_DISCRIMINATOR);

  schema.oneOf = schema.anyOf;
  deleteField(schema, 'anyOf');

  let catchAllIdx = -1;

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
  });

  if (catchAllIdx > -1) {
    schema.oneOf?.splice(catchAllIdx, 1);
  }
};
