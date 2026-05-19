/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const asCodeQuerySchema = z
  .object({
    expression: z.string().meta({
      description: 'A query expression in KQL or Lucene syntax.',
    }),
    language: z.union([z.literal('kql'), z.literal('lucene')]).meta({
      description:
        'Query language. Use `kql` for Kibana Query Language (KQL) or `lucene` for Lucene query syntax.',
    }),
  })
  .strict()
  .meta({
    id: 'kbn-as-code-query',
    title: 'Query',
    description:
      'A search query consisting of an expression and its language. Supports KQL and Lucene syntax.',
  });

export type AsCodeQuery = z.output<typeof asCodeQuerySchema>;
