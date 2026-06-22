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

/**
 * Get all synonym sets.
 *
 * Get a summary of all defined synonym sets.
 */
export const SynonymsGetSynonymsSetsRequest = z.object({
  ...RequestBase.shape,
  from: integer.describe('The starting offset for synonyms sets to retrieve.').optional().meta({ found_in: 'query' }),
  size: integer.describe('The maximum number of synonyms sets to retrieve.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SynonymsGetSynonymsSetsRequest' })
export type SynonymsGetSynonymsSetsRequest = z.infer<typeof SynonymsGetSynonymsSetsRequest>

export const SynonymsGetSynonymsSetsSynonymsSetItem = z.object({
  synonyms_set: Id.describe('Synonyms set identifier'),
  count: integer.describe('Number of synonym rules that the synonym set contains')
}).meta({ id: 'SynonymsGetSynonymsSetsSynonymsSetItem' })
export type SynonymsGetSynonymsSetsSynonymsSetItem = z.infer<typeof SynonymsGetSynonymsSetsSynonymsSetItem>

export const SynonymsGetSynonymsSetsResponse = z.object({
  count: integer.describe('The total number of synonyms sets defined.'),
  results: z.array(SynonymsGetSynonymsSetsSynonymsSetItem).describe('The identifier and total number of defined synonym rules for each synonyms set.')
}).meta({ id: 'SynonymsGetSynonymsSetsResponse' })
export type SynonymsGetSynonymsSetsResponse = z.infer<typeof SynonymsGetSynonymsSetsResponse>
