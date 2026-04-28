/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const asCodeQuerySchema = schema.object(
  {
    expression: schema.string({
      meta: {
        description: 'A query expression in KQL or Lucene syntax.',
      },
    }),
    language: schema.oneOf([schema.literal('kql'), schema.literal('lucene')], {
      meta: {
        description:
          'Query language. Use `kql` for Kibana Query Language (KQL) or `lucene` for Lucene query syntax.',
      },
    }),
  },
  {
    meta: {
      id: 'kbn-as-code-query',
      title: 'Query',
      description:
        'A search query consisting of an expression and its language. Supports KQL and Lucene syntax.',
    },
  }
);

export type AsCodeQuery = TypeOf<typeof asCodeQuerySchema>;
