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

/**
 * Get CAT help.
 *
 * Get help for the CAT APIs.
 */
export const CatHelpRequest = z.object({
}).meta({ id: 'CatHelpRequest' })
export type CatHelpRequest = z.infer<typeof CatHelpRequest>

export const CatHelpResponse = z.object({
}).meta({ id: 'CatHelpResponse' })
export type CatHelpResponse = z.infer<typeof CatHelpResponse>
