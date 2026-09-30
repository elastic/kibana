/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { ASCODE_FILTER_TYPE } from '@kbn/as-code-filters-constants';
import type { SavedObjectsType } from '@kbn/core/server';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { VEGA_SAVED_OBJECT_TYPE } from '../../common/constants';

/**
 * Temporary duplicate `@kbn/config-schema` needed for `SavedObjectsType` compatibility.
 * Use zod schema once https://github.com/elastic/kibana/pull/262683 is merged.
 * Attributes are stored in the API shape; filters replace `data_view_id` with `data_view_ref_name`.
 */
export const vegaLibraryItemSavedObjectSchema = schema.object({
  title: schema.string({ minLength: 1 }),
  description: schema.maybe(schema.string()),
  spec: schema.oneOf([
    schema.object({
      format: schema.literal('hjson'),
      value: schema.string({ minLength: 1 }),
    }),
    schema.object({
      format: schema.literal('json'),
      value: schema.object({}, { unknowns: 'allow' }),
    }),
  ]),
  query: schema.maybe(
    schema.object({
      expression: schema.string(),
      language: schema.oneOf([schema.literal('kql'), schema.literal('lucene')]),
    })
  ),
  filters: schema.maybe(
    schema.arrayOf(
      schema.object(
        {
          type: schema.oneOf([
            schema.literal(ASCODE_FILTER_TYPE.CONDITION),
            schema.literal(ASCODE_FILTER_TYPE.GROUP),
            schema.literal(ASCODE_FILTER_TYPE.DSL),
            schema.literal(ASCODE_FILTER_TYPE.SPATIAL),
          ]),
          data_view_ref_name: schema.maybe(schema.string()),
        },
        { unknowns: 'allow' }
      )
    )
  ),
});

const modelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: vegaLibraryItemSavedObjectSchema.extends({}, { unknowns: 'ignore' }),
    create: vegaLibraryItemSavedObjectSchema,
  },
};

export const vegaLibraryItemSavedObjectType: SavedObjectsType = {
  name: VEGA_SAVED_OBJECT_TYPE,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  management: {
    icon: 'visualizeApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
  },
  modelVersions: {
    '1': modelVersion1,
  },
  mappings: {
    dynamic: false,
    properties: {
      title: { type: 'text' },
      description: { type: 'text' },
    },
  },
  migrations: () => {
    return {};
  },
};
