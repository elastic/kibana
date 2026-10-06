/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
export declare const SCHEDULED_INTERVAL_PATTERN: RegExp;
export declare const SCHEDULED_INTERVAL_ERROR =
  'Scheduled interval must be at least 1 minute. Use format like "1m", "90s", "2h", "1d"';
export declare const ScheduledTriggerSchema: z.ZodObject<
  {
    type: z.ZodLiteral<'scheduled'>;
    with: z.ZodUnion<
      readonly [
        z.ZodObject<
          {
            every: z.ZodString;
          },
          z.core.$strip
        >,
        z.ZodObject<
          {
            rrule: z.ZodObject<
              {
                freq: z.ZodEnum<{
                  DAILY: 'DAILY';
                  MONTHLY: 'MONTHLY';
                  WEEKLY: 'WEEKLY';
                }>;
                interval: z.ZodNumber;
                tzid: z.ZodDefault<
                  z.ZodOptional<
                    z.ZodEnum<{
                      [x: string]: string;
                    }>
                  >
                >;
                dtstart: z.ZodOptional<z.ZodString>;
                byhour: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                byminute: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                byweekday: z.ZodOptional<
                  z.ZodArray<
                    z.ZodEnum<{
                      FR: 'FR';
                      MO: 'MO';
                      SA: 'SA';
                      SU: 'SU';
                      TH: 'TH';
                      TU: 'TU';
                      WE: 'WE';
                    }>
                  >
                >;
                bymonthday: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
              },
              z.core.$strip
            >;
          },
          z.core.$strip
        >
      ]
    >;
  },
  z.core.$strip
>;
