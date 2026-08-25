/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { Serializable } from '@kbn/utility-types';
import { FilterStateStore } from '@kbn/es-query-constants';

export const filterStateStoreSchema = z
  .union([z.literal(FilterStateStore.APP_STATE), z.literal(FilterStateStore.GLOBAL_STATE)])
  .meta({
    description:
      "Denote whether a filter is specific to an application's context (e.g. 'appState') or whether it should be applied globally (e.g. 'globalState').",
  });

export const storedFilterMetaSchema = z
  .object({
    alias: z.string().nullable().optional(),
    disabled: z.boolean().optional(),
    negate: z.boolean().optional(),
    controlledBy: z.string().optional().meta({ description: 'Identifies the owner the filter.' }),
    group: z.string().optional().meta({ description: 'The group to which this filter belongs.' }),
    relation: z.string().optional(),
    // field is missing from the Filter type, but is stored in SerializedSearchSourceFields
    // see the todo in src/platform/packages/shared/kbn-es-query/src/filters/helpers/update_filter.ts
    field: z.string().optional(),
    index: z.string().optional(),
    isMultiIndex: z.boolean().optional(),
    type: z.string().optional(),
    key: z.string().optional(),
    // We could consider creating FilterMetaParams as a schema to match the concrete Filter type.
    // However, this is difficult because FilterMetaParams can be a `storedFilterSchema` which is defined below.
    // This would require a more complex schema definition that can handle recursive types.
    // For now, we use `z.any()` to allow flexibility in the params field.
    params: z.any().optional(),
    // Typing as any since value is undocumented subset of FilterMetaParams
    value: z.any().optional(),
  })
  .loose();

type StoredFilterMeta = z.output<typeof storedFilterMetaSchema> & {
  // TODO: getLocation method expects a SerializableRecord not unknown values, see https://github.com/elastic/kibana/issues/269196
  [key: string]: Serializable;
};

export const storedFilterSchema = z
  .object({
    meta: storedFilterMetaSchema as z.ZodType<StoredFilterMeta>,
    query: z.record(z.string(), z.any()).optional(),
    $state: z
      .object({
        store: filterStateStoreSchema,
      })
      .strict()
      .optional(),
  })
  .strict()
  .meta({ id: 'kbn-es-query-server-storedFilterSchema' });
