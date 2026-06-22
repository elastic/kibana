/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const MlCalendarEvent = z.object({
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').optional(),
  event_id: Id.optional(),
  description: z.string().describe('A description of the scheduled event.'),
  end_time: DateTime.describe('The timestamp for the end of the scheduled event in milliseconds since the epoch or ISO 8601 format.'),
  start_time: DateTime.describe('The timestamp for the beginning of the scheduled event in milliseconds since the epoch or ISO 8601 format.'),
  skip_result: z.boolean().describe('When true the model will not create results for this calendar period.').optional(),
  skip_model_update: z.boolean().describe('When true the model will not be updated for this calendar period.').optional(),
  force_time_shift: integer.describe('Shift time by this many seconds. For example adjust time for daylight savings changes').optional()
}).meta({ id: 'MlCalendarEvent' })
export type MlCalendarEvent = z.infer<typeof MlCalendarEvent>

/** Get info about events in calendars. */
export const MlGetCalendarEventsRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar. You can get information for multiple calendars by using a comma-separated list of ids or a wildcard expression. You can get information for all calendars by using `_all` or `*` or by omitting the calendar identifier.').meta({ found_in: 'path' }),
  end: DateTime.describe('Specifies to get events with timestamps earlier than this time.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of events.').optional().meta({ found_in: 'query' }),
  job_id: Id.describe('Specifies to get events for a specific anomaly detection job identifier or job group. It must be used with a calendar identifier of `_all` or `*`.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of events to obtain.').optional().meta({ found_in: 'query' }),
  start: DateTime.describe('Specifies to get events with timestamps after this time.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetCalendarEventsRequest' })
export type MlGetCalendarEventsRequest = z.infer<typeof MlGetCalendarEventsRequest>

export const MlGetCalendarEventsResponse = z.object({
  count: long,
  events: z.array(MlCalendarEvent)
}).meta({ id: 'MlGetCalendarEventsResponse' })
export type MlGetCalendarEventsResponse = z.infer<typeof MlGetCalendarEventsResponse>
