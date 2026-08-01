/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Hostname suffixes for `https://api.${site}`.
 * Values match Datadog API hosts — not the `app.*` labels shown in their docs UI.
 * @see https://docs.datadoghq.com/getting_started/site/
 */
export const DATADOG_SITES = [
  'datadoghq.com', // US1
  'us3.datadoghq.com', // US3
  'us5.datadoghq.com', // US5
  'datadoghq.eu', // EU
  'ap1.datadoghq.com', // AP1
  'ap2.datadoghq.com', // AP2
  'uk1.datadoghq.com', // UK1
  'ddog-gov.com', // US1-FED
  'us2.ddog-gov.com', // US2-FED
] as const;

export type DatadogSite = (typeof DATADOG_SITES)[number];

export const MuteMonitorInputSchema = lazySchema(() =>
  z.object({
    monitorId: z
      .number()
      .int()
      .positive()
      .describe('Datadog monitor ID to mute. Example: 309422658'),
    scope: z
      .string()
      .optional()
      .describe('Optional scope to mute (e.g. "host:web01"). Omit to mute all scopes.'),
    end: z
      .number()
      .int()
      .optional()
      .describe('Optional mute end time as Unix epoch seconds. Omit for indefinite mute.'),
  })
);

export const UnmuteMonitorInputSchema = lazySchema(() =>
  z.object({
    monitorId: z.number().int().positive().describe('Datadog monitor ID to unmute'),
    scope: z
      .string()
      .optional()
      .describe(
        'Optional scope to unmute (e.g. "host:web01"). Use the same scope that was muted. Omit to unmute the global * scope.'
      ),
  })
);

export const GetMonitorInputSchema = lazySchema(() =>
  z.object({
    monitorId: z.number().int().positive().describe('Datadog monitor ID'),
  })
);

export const ListMonitorsInputSchema = lazySchema(() =>
  z.object({
    name: z.string().optional().describe('Filter monitors by name substring'),
    tags: z
      .string()
      .optional()
      .describe('Comma-separated tags filter, e.g. "env:demo,monitoring-tier:datadog"'),
    groupStates: z
      .string()
      .optional()
      .describe('Comma-separated group states, e.g. "alert,warn". Example: "alert"'),
    page: z.number().int().min(0).optional().describe('Page number (0-based). Defaults to 0.'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Results per page (1–1000). Defaults to 100.'),
  })
);

export type MuteMonitorInput = z.infer<typeof MuteMonitorInputSchema>;
export type UnmuteMonitorInput = z.infer<typeof UnmuteMonitorInputSchema>;
export type GetMonitorInput = z.infer<typeof GetMonitorInputSchema>;
export type ListMonitorsInput = z.infer<typeof ListMonitorsInputSchema>;
