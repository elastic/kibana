/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const querySchema = z
  .object({
    query: z.union([
      z.string().meta({
        description:
          'A text-based query such as Kibana Query Language (KQL) or Lucene query language.',
      }),
      z.record(z.string(), z.any()),
    ]),
    language: z.string(),
  })
  .strict()
  .meta({ id: 'kbn-es-query-server-querySchema' });

export const aggregateQuerySchema = z
  .object({
    esql: z.string(),
  })
  .strict()
  .meta({ id: 'kbn-es-query-server-aggregateQuerySchema' });
