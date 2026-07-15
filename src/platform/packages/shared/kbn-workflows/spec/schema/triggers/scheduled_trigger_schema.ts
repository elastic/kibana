/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { timezoneNames } from './timezone_names';

// Minimum interval is 1 minute (60s). Seconds are allowed only for values ≥ 60.
export const SCHEDULED_INTERVAL_PATTERN = /^(([6-9]\d|\d{3,})s|\d+[mhd])$/;
export const SCHEDULED_INTERVAL_ERROR =
  'Scheduled interval must be at least 1 minute. Use format like "1m", "90s", "2h", "1d"';

export const ScheduledTriggerSchema = z.object({
  type: z.literal('scheduled'),
  with: z.union([
    z.object({
      every: z.string().regex(SCHEDULED_INTERVAL_PATTERN, SCHEDULED_INTERVAL_ERROR),
    }),
    z.object({
      rrule: z.object({
        freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
        interval: z.number().int().positive(),
        tzid: z
          .enum(timezoneNames as [string, ...string[]])
          .optional()
          .default('UTC'),
        dtstart: z.string().optional(),
        byhour: z.array(z.number().int().min(0).max(23)).optional(),
        byminute: z.array(z.number().int().min(0).max(59)).optional(),
        byweekday: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional(),
        bymonthday: z.array(z.number().int().min(1).max(31)).optional(),
      }),
    }),
  ]),
});
