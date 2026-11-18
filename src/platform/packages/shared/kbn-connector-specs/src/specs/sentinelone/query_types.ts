/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
/** A relative time such as 1h, 30m or 7d, or an epoch timestamp (seconds, milliseconds or nanoseconds). */
const QUERY_TIME_PATTERN = /^(\d{1,4}\s*[a-zA-Z]{1,7}|\d{9,19})$/;

const queryTime = (description: string) =>
  z.string().min(1).max(32).regex(QUERY_TIME_PATTERN).optional().describe(description);

// runQuery: POST /sdl/v2/api/queries, GET and DELETE /sdl/v2/api/queries/{id}
export const RunQueryInputSchema = lazySchema(() =>
  z
    .object({
      query: z
        .string()
        .trim()
        .min(1)
        .max(4096)
        .describe(
          'Power Query (PQ) text, 1 to 4096 characters: the filter first, then pipes, for example dataSource.name = "x" | limit 10. A bare * is invalid'
        ),
      startTime: queryTime(
        'Start of the time range: relative such as 1h, 24h or 7d, or an epoch timestamp in seconds, milliseconds or nanoseconds. Default: 24 hours before endTime (or the last 24 hours)'
      ),
      endTime: queryTime(
        'End of the time range: relative such as 1h, or an epoch timestamp in seconds, milliseconds or nanoseconds. Default: now (or 24 hours after startTime)'
      ),
      queryPriority: z
        .enum(['LOW', 'HIGH'])
        .optional()
        .describe('LOW (default) has more generous rate limits; HIGH has tighter ones'),
      accountIds: z
        .array(z.string().min(1).max(32).regex(ID_PATTERN))
        .min(1)
        .max(100)
        .optional()
        .describe(
          "Account ids to query (connector bound 100). Filter by site inside the query instead, for example site.id in ('1', '2')"
        ),
      tenant: z
        .boolean()
        .optional()
        .describe(
          'true queries every scope the token can reach (global scope for a global admin); not with accountIds'
        ),
      waitSeconds: z
        .number()
        .int()
        .min(10)
        .max(100)
        .optional()
        .describe(
          'How long the connector waits for the result, 10 to 100 seconds (default 60). Keeps one call under the 120-second limit of the Kibana connector execute API'
        ),
    })
    .refine((value) => !(value.tenant === true && value.accountIds !== undefined), {
      message: 'tenant must not be true when accountIds is set',
      path: ['tenant'],
    })
);
export type RunQueryInput = z.infer<typeof RunQueryInputSchema>;
