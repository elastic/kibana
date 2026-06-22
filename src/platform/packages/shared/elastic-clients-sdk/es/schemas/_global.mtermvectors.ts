/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { TermvectorsFilter, TermvectorsTermVector } from './_global.termvectors'
import { ErrorCause, Field, Fields, Id, IndexName, RequestBase, Routing, VersionNumber, VersionType, long } from './_types'

export const MtermvectorsOperation = z.object({
  _id: Id.describe('The ID of the document.').optional(),
  _index: IndexName.describe('The index of the document.').optional(),
  doc: z.any().describe('An artificial document (a document not present in the index) for which you want to retrieve term vectors.').optional(),
  fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in the statistics. Used as the default list unless a specific field list is provided in the `completion_fields` or `fielddata_fields` parameters.').optional(),
  field_statistics: z.boolean().describe('If `true`, the response includes the document count, sum of document frequencies, and sum of total term frequencies.').optional(),
  filter: TermvectorsFilter.describe('Filter terms based on their tf-idf scores.').optional(),
  offsets: z.boolean().describe('If `true`, the response includes term offsets.').optional(),
  payloads: z.boolean().describe('If `true`, the response includes term payloads.').optional(),
  positions: z.boolean().describe('If `true`, the response includes term positions.').optional(),
  routing: Routing.describe('Custom value used to route operations to a specific shard.').optional(),
  term_statistics: z.boolean().describe('If true, the response includes term frequency and document frequency.').optional(),
  version: VersionNumber.describe('If `true`, returns the document version as part of a hit.').optional(),
  version_type: VersionType.describe('Specific version type.').optional()
}).meta({ id: 'MtermvectorsOperation' })
export type MtermvectorsOperation = z.infer<typeof MtermvectorsOperation>

/**
 * Get multiple term vectors.
 *
 * Get multiple term vectors with a single request.
 * You can specify existing documents by index and ID or provide artificial documents in the body of the request.
 * You can specify the index in the request body or request URI.
 * The response contains a `docs` array with all the fetched termvectors.
 * Each element has the structure provided by the termvectors API.
 *
 * **Artificial documents**
 *
 * You can also use `mtermvectors` to generate term vectors for artificial documents provided in the body of the request.
 * The mapping used is determined by the specified `_index`.
 */
export const MtermvectorsRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the index that contains the documents.').optional().meta({ found_in: 'path' }),
  fields: Fields.describe('A comma-separated list or wildcard expressions of fields to include in the statistics. It is used as the default list unless a specific field list is provided in the `completion_fields` or `fielddata_fields` parameters.').optional().meta({ found_in: 'query' }),
  field_statistics: z.boolean().describe('If `true`, the response includes the document count, sum of document frequencies, and sum of total term frequencies.').optional().meta({ found_in: 'query' }),
  offsets: z.boolean().describe('If `true`, the response includes term offsets.').optional().meta({ found_in: 'query' }),
  payloads: z.boolean().describe('If `true`, the response includes term payloads.').optional().meta({ found_in: 'query' }),
  positions: z.boolean().describe('If `true`, the response includes term positions.').optional().meta({ found_in: 'query' }),
  preference: z.string().describe('The node or shard the operation should be performed on. It is random by default.').optional().meta({ found_in: 'query' }),
  realtime: z.boolean().describe('If true, the request is real-time as opposed to near-real-time.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  term_statistics: z.boolean().describe('If true, the response includes term frequency and document frequency.').optional().meta({ found_in: 'query' }),
  version: VersionNumber.describe('If `true`, returns the document version as part of a hit.').optional().meta({ found_in: 'query' }),
  version_type: VersionType.describe('The version type.').optional().meta({ found_in: 'query' }),
  docs: z.array(MtermvectorsOperation).describe('An array of existing or artificial documents.').optional().meta({ found_in: 'body' }),
  ids: z.array(Id).describe('A simplified syntax to specify documents by their ID if they\'re in the same index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MtermvectorsRequest' })
export type MtermvectorsRequest = z.infer<typeof MtermvectorsRequest>

export const MtermvectorsTermVectorsResult = z.object({
  _id: Id.optional(),
  _index: IndexName,
  _version: VersionNumber.optional(),
  took: long.optional(),
  found: z.boolean().optional(),
  term_vectors: z.record(Field, TermvectorsTermVector).optional(),
  error: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'MtermvectorsTermVectorsResult' })
export type MtermvectorsTermVectorsResult = z.infer<typeof MtermvectorsTermVectorsResult>

export const MtermvectorsResponse = z.object({
  docs: z.array(MtermvectorsTermVectorsResult)
}).meta({ id: 'MtermvectorsResponse' })
export type MtermvectorsResponse = z.infer<typeof MtermvectorsResponse>
