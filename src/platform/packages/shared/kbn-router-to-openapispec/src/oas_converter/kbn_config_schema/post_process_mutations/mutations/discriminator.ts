/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metaFields } from '@kbn/config-schema';
import type { OpenAPIV3 } from 'openapi-types';
import { deleteField } from './utils';
import type { IContext } from '../context';

const { META_FIELD_X_OAS_DISCRIMINATOR } = metaFields;

export const processDiscriminator = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  const firstSchema = (schema.anyOf?.[0] ?? {}) as OpenAPIV3.SchemaObject;
  if (!(META_FIELD_X_OAS_DISCRIMINATOR in firstSchema)) return;

  const propertyName = firstSchema[
    META_FIELD_X_OAS_DISCRIMINATOR as keyof OpenAPIV3.SchemaObject
  ] as string;

  schema.discriminator = { propertyName };
  deleteField(firstSchema, META_FIELD_X_OAS_DISCRIMINATOR);

  schema.oneOf = schema.anyOf;
  deleteField(schema, 'anyOf');

  const namespace = ctx.getNamespace();

  (schema.oneOf ?? []).forEach((entry, idx) => {
    ctx.addSharedSchema(`${namespace}-${idx}`, entry as OpenAPIV3.SchemaObject);
    schema.oneOf![idx] = { $ref: `#/components/schemas/${namespace}-${idx}` };
  });
};
