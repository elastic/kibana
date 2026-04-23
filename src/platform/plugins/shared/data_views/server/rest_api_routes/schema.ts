/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { SERVICE_KEY, SERVICE_KEY_LEGACY } from '../constants';

import {
  fieldSpecSchema,
  runtimeFieldSchema,
  serializedFieldFormatSchema,
  fieldSpecSchemaFields,
} from '../schemas';
import { MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH } from '../../common/constants';

export const dataViewSpecSchema = schema.object(
  {
    title: schema.string({
      meta: {
        description:
          'A comma-separated list of data streams, indices, and aliases that the data view should match. Supports wildcards (`*`).',
      },
    }),
    version: schema.maybe(
      schema.string({
        meta: {
          description: 'The version of the data view. Used for optimistic concurrency control.',
        },
      })
    ),
    id: schema.maybe(
      schema.string({
        meta: {
          description:
            'A unique identifier for the data view. If not provided, an ID is generated automatically.',
        },
      })
    ),
    type: schema.maybe(
      schema.string({
        meta: { description: 'The type of data view. Set to `rollup` for rollup data views.' },
      })
    ),
    timeFieldName: schema.maybe(
      schema.string({
        meta: {
          description: 'The timestamp field name used for time-based data views.',
        },
      })
    ),
    sourceFilters: schema.maybe(
      schema.arrayOf(
        schema.object({
          value: schema.string({
            meta: {
              description:
                'The field name or pattern to filter from the source. Supports wildcards (`*`).',
            },
          }),
          clientId: schema.maybe(
            schema.oneOf([schema.string(), schema.number()], {
              meta: { description: 'A client-side identifier for the source filter.' },
            })
          ),
        }),
        {
          meta: {
            description:
              'An array of field patterns to exclude from `_source` in document results.',
          },
        }
      )
    ),
    fields: schema.maybe(
      schema.recordOf(schema.string(), fieldSpecSchema, {
        meta: { description: 'A map of field names to their specifications.' },
      })
    ),
    typeMeta: schema.maybe(
      schema.object(
        {},
        {
          unknowns: 'allow',
          meta: {
            description:
              'Type-specific metadata. For rollup data views, contains information about rollup jobs and their capabilities.',
          },
        }
      )
    ),
    fieldFormats: schema.maybe(
      schema.recordOf(schema.string(), serializedFieldFormatSchema, {
        meta: {
          description: 'A map of field names to their custom field format configurations.',
        },
      })
    ),
    fieldAttrs: schema.maybe(
      schema.recordOf(
        schema.string(),
        schema.object({
          customLabel: schema.maybe(
            schema.string({
              meta: { description: 'A custom display label for the field.' },
            })
          ),
          customDescription: schema.maybe(
            schema.string({
              maxLength: MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
              meta: { description: 'A custom description for the field.' },
            })
          ),
          count: schema.maybe(
            schema.number({
              meta: { description: 'A popularity count for the field.' },
            })
          ),
        }),
        {
          meta: {
            description:
              'A map of field names to their custom attributes, such as custom labels, descriptions, and popularity counts.',
          },
        }
      )
    ),
    allowNoIndex: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'When `true`, allows the data view to exist with no matching indices. This prevents errors when the index pattern does not match any indices.',
        },
      })
    ),
    runtimeFieldMap: schema.maybe(
      schema.recordOf(schema.string(), runtimeFieldSchema, {
        meta: {
          description:
            'A map of runtime field names to their definitions. Runtime fields are computed at query time using a Painless script.',
        },
      })
    ),
    name: schema.maybe(
      schema.string({
        meta: { description: 'The human-readable display name for the data view.' },
      })
    ),
    namespaces: schema.maybe(
      schema.arrayOf(schema.string(), {
        meta: {
          description: 'The Kibana namespaces (spaces) where this data view is available.',
        },
      })
    ),
    allowHidden: schema.maybe(
      schema.boolean({
        meta: { description: 'When `true`, allows the data view to match hidden indices.' },
      })
    ),
  },
  { meta: { id: 'data_view_spec' } }
);

export const dataViewsRuntimeResponseSchema = () =>
  schema.object({
    [SERVICE_KEY]: dataViewSpecSchema,
    fields: schema.arrayOf(schema.object(fieldSpecSchemaFields)),
  });

export const indexPatternsRuntimeResponseSchema = () =>
  schema.object({
    [SERVICE_KEY_LEGACY]: dataViewSpecSchema,
    field: schema.object(fieldSpecSchemaFields),
  });

export const runtimeResponseSchema = () =>
  schema.oneOf([dataViewsRuntimeResponseSchema(), indexPatternsRuntimeResponseSchema()]);
