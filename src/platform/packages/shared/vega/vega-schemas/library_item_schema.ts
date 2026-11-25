/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, displayName, description } from '@kbn/zod';
import { getAsCodeTagsSchema } from '@kbn/as-code-shared-schemas';
import { vegaFiltersSchema, vegaQuerySchema, vegaSpecSchema } from './schema';

export const vegaLibraryItemSchema = z
  .object({
    title: displayName().meta({ description: 'The Vega library item title.' }),
    description: description()
      .optional()
      .meta({ description: 'A short description of the Vega library item.' }),
    spec: vegaSpecSchema,
    tags: getAsCodeTagsSchema().optional(),
    query: vegaQuerySchema.meta({
      description:
        'KQL or Lucene query. Applied together with the dashboard query to Elasticsearch and ES|QL data sources that use `%context%: true`, and to Elasticsearch data sources that use `%dashboard_context-*%` placeholders.',
    }),
    filters: vegaFiltersSchema.meta({
      description:
        'Filters. Applied together with the dashboard filters to Elasticsearch and ES|QL data sources that use `%context%: true`, and to Elasticsearch data sources that use `%dashboard_context-*%` placeholders.',
    }),
  })
  .strict();

export type VegaLibraryItemState = z.output<typeof vegaLibraryItemSchema>;
