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

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/** Create a calendar. */
export const MlPutCalendarRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').meta({ found_in: 'path' }),
  job_ids: z.array(Id).describe('An array of anomaly detection job identifiers.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('A description of the calendar.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutCalendarRequest' })
export type MlPutCalendarRequest = z.infer<typeof MlPutCalendarRequest>

export const MlPutCalendarResponse = z.object({
  calendar_id: Id.describe('A string that uniquely identifies a calendar.'),
  description: z.string().describe('A description of the calendar.').optional(),
  job_ids: Ids.describe('A list of anomaly detection job identifiers or group names.')
}).meta({ id: 'MlPutCalendarResponse' })
export type MlPutCalendarResponse = z.infer<typeof MlPutCalendarResponse>
