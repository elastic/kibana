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

/** Add scheduled events to the calendar. */
export const MlPostCalendarEventsRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').meta({ found_in: 'path' }),
  events: z.array(MlCalendarEvent).describe('A list of one of more scheduled events. The event’s start and end times can be specified as integer milliseconds since the epoch or as a string in ISO 8601 format.').meta({ found_in: 'body' })
}).meta({ id: 'MlPostCalendarEventsRequest' })
export type MlPostCalendarEventsRequest = z.infer<typeof MlPostCalendarEventsRequest>

export const MlPostCalendarEventsResponse = z.object({
  events: z.array(MlCalendarEvent)
}).meta({ id: 'MlPostCalendarEventsResponse' })
export type MlPostCalendarEventsResponse = z.infer<typeof MlPostCalendarEventsResponse>
