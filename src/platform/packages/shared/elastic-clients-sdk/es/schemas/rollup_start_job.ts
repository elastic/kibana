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

/**
 * Start rollup jobs.
 *
 * If you try to start a job that does not exist, an exception occurs.
 * If you try to start a job that is already started, nothing happens.
 * @deprecated
 */
export const RollupStartJobRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the rollup job.').meta({ found_in: 'path' })
}).meta({ id: 'RollupStartJobRequest' })
export type RollupStartJobRequest = z.infer<typeof RollupStartJobRequest>

export const RollupStartJobResponse = z.object({
  started: z.boolean()
}).meta({ id: 'RollupStartJobResponse' })
export type RollupStartJobResponse = z.infer<typeof RollupStartJobResponse>
