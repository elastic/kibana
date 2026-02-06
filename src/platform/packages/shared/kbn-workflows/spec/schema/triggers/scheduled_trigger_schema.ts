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

export const ScheduledTriggerSchema = z.object({
  type: z.literal('scheduled'),
  with: z.union([
    // New format: every: "5m", "2h", "1d", "30s"
    z.object({
      every: z
        .string()
        .regex(/^\d+[smhd]$/, 'Invalid interval format. Use format like "5m", "2h", "1d", "30s"'),
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
