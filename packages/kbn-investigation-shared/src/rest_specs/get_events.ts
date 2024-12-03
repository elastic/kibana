/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { eventResponseSchema } from './event';
import { eventTypeSchema } from '../schema';

const getEventsParamsSchema = z
  .object({
    query: z
      .object({
        rangeFrom: z.string(),
        rangeTo: z.string(),
        filter: z.string(),
        types: z.string().transform((val, ctx) => {
          const eventTypes = val.split(',');
          const hasInvalidType = eventTypes.some((type) => !eventTypeSchema.parse(type));
          if (hasInvalidType) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid event type',
            });
            return z.NEVER;
          }
          return eventTypes;
        }),
      })
      .partial(),
  })
  .partial();

const getEventsResponseSchema = z.array(eventResponseSchema);

type GetEventsParams = z.infer<typeof getEventsParamsSchema.shape.query>;
type GetEventsResponse = z.output<typeof getEventsResponseSchema>;

export { getEventsParamsSchema, getEventsResponseSchema };
export type { GetEventsParams, GetEventsResponse };
