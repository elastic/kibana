/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { entityWithSourceSchema } from './entity';

const getEntitiesParamsSchema = z
  .object({
    query: z
      .object({
        'service.name': z.string(),
        'service.environment': z.string(),
        'host.name': z.string(),
        'container.id': z.string(),
      })
      .partial(),
  })
  .partial();

const getEntitiesResponseSchema = z.object({
  entities: z.array(entityWithSourceSchema),
});

type GetEntitiesParams = z.infer<typeof getEntitiesParamsSchema.shape.query>;
type GetEntitiesResponse = z.output<typeof getEntitiesResponseSchema>;

export { getEntitiesParamsSchema, getEntitiesResponseSchema };
export type { GetEntitiesParams, GetEntitiesResponse };
