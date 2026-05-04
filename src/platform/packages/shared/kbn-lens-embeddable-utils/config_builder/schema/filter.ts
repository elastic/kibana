/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const filterSchema = schema.object(
  {
    language: schema.oneOf([schema.literal('kql'), schema.literal('lucene')], {
      defaultValue: 'kql',
      meta: {
        description:
          'Query language: `kql` (Kibana Query Language) or `lucene`. Defaults to `kql`.',
      },
    }),
    expression: schema.string({
      meta: {
        description: 'A query expression in KQL or Lucene syntax',
      },
    }),
  },
  {
    meta: {
      id: 'filterSimple',
      title: 'Filter',
      description:
        'A KQL or Lucene query that filters panel data. Applied on top of any dashboard-level filters.',
    },
  }
);

export const filterWithLabelSchema = schema.object(
  {
    /**
     * Filter query
     */
    filter: filterSchema,
    /**
     * Label for the filter
     */
    label: schema.maybe(
      schema.string({
        meta: {
          description: 'Label for the filter',
        },
      })
    ),
  },
  {
    meta: {
      id: 'filterWithLabel',
      title: 'Filter with Label',
      description: 'A KQL or Lucene filter with an optional display label.',
    },
  }
);

export type LensApiFilterType = typeof filterSchema.type;
