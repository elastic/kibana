/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema, ObjectType } from '@kbn/config-schema';

export const apiError = schema.object({
  error: schema.string(),
  message: schema.string(),
  statusCode: schema.number(),
  metadata: schema.object({}, { unknowns: 'allow' }),
});

export const referenceSchema = schema.object(
  {
    name: schema.maybe(schema.string()),
    type: schema.string(),
    id: schema.string(),
  },
  { unknowns: 'forbid' }
);

export const referencesSchema = schema.arrayOf(referenceSchema);

export const savedObjectSchema = (attributesSchema: ObjectType<any>) =>
  schema.object(
    {
      id: schema.string(),
      type: schema.string(),
      version: schema.maybe(schema.string()),
      createdAt: schema.maybe(schema.string()),
      updatedAt: schema.maybe(schema.string()),
      error: schema.maybe(apiError),
      attributes: attributesSchema,
      references: referencesSchema,
      namespaces: schema.maybe(schema.arrayOf(schema.string())),
      originId: schema.maybe(schema.string()),
    },
    { unknowns: 'allow' }
  );

export const objectTypeToGetResultSchema = (soSchema: ObjectType<any>) =>
  schema.object(
    {
      item: soSchema,
      meta: schema.object(
        {
          outcome: schema.oneOf([
            schema.literal('exactMatch'),
            schema.literal('aliasMatch'),
            schema.literal('conflict'),
          ]),
          aliasTargetId: schema.maybe(schema.string()),
          aliasPurpose: schema.maybe(
            schema.oneOf([
              schema.literal('savedObjectConversion'),
              schema.literal('savedObjectImport'),
            ])
          ),
        },
        { unknowns: 'forbid' }
      ),
    },
    { unknowns: 'forbid' }
  );

export const createOptionsSchema = schema.object({
  references: schema.maybe(referencesSchema),
});

export const createResultSchema = (soSchema: ObjectType<any>) =>
  schema.object(
    {
      item: soSchema,
    },
    { unknowns: 'forbid' }
  );
