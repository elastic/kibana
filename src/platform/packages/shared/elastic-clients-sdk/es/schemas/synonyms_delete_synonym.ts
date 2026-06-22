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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete a synonym set.
 *
 * You can only delete a synonyms set that is not in use by any index analyzer.
 *
 * Synonyms sets can be used in synonym graph token filters and synonym token filters.
 * These synonym filters can be used as part of search analyzers.
 *
 * Analyzers need to be loaded when an index is restored (such as when a node starts, or the index becomes open).
 * Even if the analyzer is not used on any field mapping, it still needs to be loaded on the index recovery phase.
 *
 * If any analyzers cannot be loaded, the index becomes unavailable and the cluster status becomes red or yellow as index shards are not available.
 * To prevent that, synonyms sets that are used in analyzers can't be deleted.
 * A delete request in this case will return a 400 response code.
 *
 * To remove a synonyms set, you must first remove all indices that contain analyzers using it.
 * You can migrate an index by creating a new index that does not contain the token filter with the synonyms set, and use the reindex API in order to copy over the index data.
 * Once finished, you can delete the index.
 * When the synonyms set is not used in analyzers, you will be able to delete it.
 */
export const SynonymsDeleteSynonymRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The synonyms set identifier to delete.').meta({ found_in: 'path' })
}).meta({ id: 'SynonymsDeleteSynonymRequest' })
export type SynonymsDeleteSynonymRequest = z.infer<typeof SynonymsDeleteSynonymRequest>

export const SynonymsDeleteSynonymResponse = AcknowledgedResponseBase.meta({ id: 'SynonymsDeleteSynonymResponse' })
export type SynonymsDeleteSynonymResponse = z.infer<typeof SynonymsDeleteSynonymResponse>
