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

export const SynonymsSynonymString = z.string().meta({ id: 'SynonymsSynonymString' })
export type SynonymsSynonymString = z.infer<typeof SynonymsSynonymString>

export const SynonymsSynonymRuleRead = z.object({
  id: Id.describe('The identifier for the synonym rule. If you do not specify a synonym rule ID when you create a rule, an identifier is created automatically by Elasticsearch.'),
  synonyms: SynonymsSynonymString.describe('The synonyms that conform the synonym rule in Solr format.')
}).meta({ id: 'SynonymsSynonymRuleRead' })
export type SynonymsSynonymRuleRead = z.infer<typeof SynonymsSynonymRuleRead>

/** Get a synonym set. */
export const SynonymsGetSynonymRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The synonyms set identifier to retrieve.').meta({ found_in: 'path' }),
  from: integer.describe('The starting offset for query rules to retrieve.').optional().meta({ found_in: 'query' }),
  size: integer.describe('The max number of query rules to retrieve.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SynonymsGetSynonymRequest' })
export type SynonymsGetSynonymRequest = z.infer<typeof SynonymsGetSynonymRequest>

export const SynonymsGetSynonymResponse = z.object({
  count: integer.describe('The total number of synonyms rules that the synonyms set contains.'),
  synonyms_set: z.array(SynonymsSynonymRuleRead).describe('Synonym rule details.')
}).meta({ id: 'SynonymsGetSynonymResponse' })
export type SynonymsGetSynonymResponse = z.infer<typeof SynonymsGetSynonymResponse>
