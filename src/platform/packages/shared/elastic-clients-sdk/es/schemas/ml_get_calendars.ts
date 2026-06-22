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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const MlPage = z.object({
  from: integer.describe('Skips the specified number of items.').optional(),
  size: integer.describe('Specifies the maximum number of items to obtain.').optional()
}).meta({ id: 'MlPage' })
export type MlPage = z.infer<typeof MlPage>

export const MlGetCalendarsCalendar = z.object({
  calendar_id: Id.describe('A string that uniquely identifies a calendar.'),
  description: z.string().describe('A description of the calendar.').optional(),
  job_ids: z.array(Id).describe('An array of anomaly detection job identifiers.')
}).meta({ id: 'MlGetCalendarsCalendar' })
export type MlGetCalendarsCalendar = z.infer<typeof MlGetCalendarsCalendar>

/** Get calendar configuration info. */
export const MlGetCalendarsRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar. You can get information for multiple calendars by using a comma-separated list of ids or a wildcard expression. You can get information for all calendars by using `_all` or `*` or by omitting the calendar identifier.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of calendars. This parameter is supported only when you omit the calendar identifier.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of calendars to obtain. This parameter is supported only when you omit the calendar identifier.').optional().meta({ found_in: 'query' }),
  page: MlPage.describe('This object is supported only when you omit the calendar identifier.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetCalendarsRequest' })
export type MlGetCalendarsRequest = z.infer<typeof MlGetCalendarsRequest>

export const MlGetCalendarsResponse = z.object({
  calendars: z.array(MlGetCalendarsCalendar),
  count: long
}).meta({ id: 'MlGetCalendarsResponse' })
export type MlGetCalendarsResponse = z.infer<typeof MlGetCalendarsResponse>
