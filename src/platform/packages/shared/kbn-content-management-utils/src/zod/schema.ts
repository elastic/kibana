/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, type ZodType } from '@kbn/zod';

/**
 * Some Zod object schema type
 *
 * This enforces only that the **output** of the schema is an object, not that
 * it is of the type `ZodObject`.
 */
export type ZodObjectType = ZodType<Record<string, unknown>>; // TODO: move this to kbn-zod package

export const apiError = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  metadata: z.object({}).loose(),
});

export const referenceSchema = z
  .object({
    name: z.string(),
    type: z.string(),
    id: z.string(),
  })
  .strict()
  .meta({ id: 'kbn-content-management-utils-referenceSchema' });

export const referencesSchema = z.array(referenceSchema);

export const savedObjectSchema = <T extends ZodObjectType>(attributesSchema: T) =>
  z
    .object({
      id: z.string(),
      type: z.string(),
      version: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional(),
      error: apiError.optional(),
      attributes: attributesSchema,
      references: referencesSchema,
      namespaces: z.array(z.string()).optional(),
      originId: z.string().optional(),
      managed: z.boolean().optional(),
    })
    .loose();

export const objectTypeToGetResultSchema = <T extends ZodObjectType>(soSchema: T) =>
  z
    .object({
      item: soSchema,
      meta: z
        .object({
          outcome: z.union([
            z.literal('exactMatch'),
            z.literal('aliasMatch'),
            z.literal('conflict'),
          ]),
          aliasTargetId: z.string().optional(),
          aliasPurpose: z
            .union([z.literal('savedObjectConversion'), z.literal('savedObjectImport')])
            .optional(),
        })
        .strict(),
    })
    .strict();

export const createOptionsSchema = z.object({
  id: z.string().optional(),
  references: referencesSchema.optional(),
  overwrite: z.boolean().optional(),
  version: z.string().optional(),
  refresh: z.boolean().optional(),
  initialNamespaces: z.array(z.string()).optional(),
  managed: z.boolean().optional(),
});

export const schemaAndOr = z.union([z.literal('AND'), z.literal('OR')]);

export const searchOptionsSchema = z.object({
  page: z.number().optional(),
  perPage: z.number().optional(),
  sortField: z.string().optional(),
  sortOrder: z.union([z.literal('asc'), z.literal('desc')]).optional(),
  fields: z.array(z.string()).optional(),
  search: z.string().optional(),
  searchFields: z.union([z.string(), z.array(z.string())]).optional(),
  rootSearchFields: z.array(z.string()).optional(),
  hasReference: z.union([referenceSchema, z.array(referenceSchema)]).optional(),
  hasReferenceOperator: schemaAndOr.optional(),
  hasNoReference: z.union([referenceSchema, z.array(referenceSchema)]).optional(),
  hasNoReferenceOperator: schemaAndOr.optional(),
  defaultSearchOperator: schemaAndOr.optional(),
  namespaces: z.array(z.string()).optional(),
  type: z.string().optional(),
  filter: z.string().optional(),
  pit: z
    .object({
      id: z.string(),
      keepAlive: z.string().optional(),
    })
    .optional(),
});

export const updateOptionsSchema = z.object({
  references: referencesSchema.optional(),
  version: z.string().optional(),
  refresh: z.union([z.boolean(), z.literal('wait_for')]).optional(),
  upsert: z.unknown().optional(), // TODO: see if and where this is used and remove if not needed
  retryOnConflict: z.number().optional(),
  mergeAttributes: z.boolean().optional(),
});

export const createResultSchema = <T extends ZodObjectType>(soSchema: T) =>
  z
    .object({
      item: soSchema,
    })
    .strict();

export const searchResultSchema = <T extends ZodObjectType, M extends ZodObjectType = never>(
  soSchema: T,
  metaSchema?: M
) => {
  const pagination = z.object({
    total: z.number(),
    cursor: z.string().optional(),
  });
  if (metaSchema) {
    return z
      .object({
        hits: z.array(soSchema),
        pagination,
        meta: metaSchema,
      })
      .strict();
  }
  return z
    .object({
      hits: z.array(soSchema),
      pagination,
    })
    .strict();
};
