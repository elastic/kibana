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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/** Clear an SQL search cursor. */
export const SqlClearCursorRequest = z.object({
  ...RequestBase.shape,
  cursor: z.string().describe('Cursor to clear.').meta({ found_in: 'body' })
}).meta({ id: 'SqlClearCursorRequest' })
export type SqlClearCursorRequest = z.infer<typeof SqlClearCursorRequest>

export const SqlClearCursorResponse = z.object({
  succeeded: z.boolean()
}).meta({ id: 'SqlClearCursorResponse' })
export type SqlClearCursorResponse = z.infer<typeof SqlClearCursorResponse>
