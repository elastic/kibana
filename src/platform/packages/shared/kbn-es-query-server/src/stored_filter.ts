/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query-constants';

export const filterStateStoreSchema = schema.oneOf(
  [schema.literal(FilterStateStore.APP_STATE), schema.literal(FilterStateStore.GLOBAL_STATE)],
  {
    meta: {
      description:
        "Denote whether a filter is specific to an application's context (e.g. 'appState') or whether it should be applied globally (e.g. 'globalState').",
    },
  }
);

export const storedFilterMetaSchema = schema.object(
  {
    alias: schema.maybe(schema.nullable(schema.string())),
    disabled: schema.maybe(schema.boolean()),
    negate: schema.maybe(schema.boolean()),
    controlledBy: schema.maybe(
      schema.string({ meta: { description: 'Identifies the owner the filter.' } })
    ),
    group: schema.maybe(
      schema.string({ meta: { description: 'The group to which this filter belongs.' } })
    ),
    relation: schema.maybe(schema.string()),
    // field is missing from the Filter type, but is stored in SerializedSearchSourceFields
    // see the todo in src/platform/packages/shared/kbn-es-query/src/filters/helpers/update_filter.ts
    field: schema.maybe(schema.string()),
    index: schema.maybe(schema.string()),
    isMultiIndex: schema.maybe(schema.boolean()),
    type: schema.maybe(schema.string()),
    key: schema.maybe(schema.string()),
    // We could consider creating FilterMetaParams as a schema to match the concrete Filter type.
    // However, this is difficult because FilterMetaParams can be a `storedFilterSchema` which is defined below.
    // This would require a more complex schema definition that can handle recursive types.
    // For now, we use `schema.any()` to allow flexibility in the params field.
    params: schema.maybe(schema.any()),
    value: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

export const storedFilterSchema = schema.object(
  {
    meta: storedFilterMetaSchema,
    query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    $state: schema.maybe(
      schema.object({
        store: filterStateStoreSchema,
      })
    ),
  },
  { meta: { id: 'kbn-es-query-server-storedFilterSchema' } }
);
