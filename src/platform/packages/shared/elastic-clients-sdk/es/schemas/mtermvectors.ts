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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const TermvectorsFilter = z.object({
  max_doc_freq: integer.describe('Ignore words which occur in more than this many docs. Defaults to unbounded.').optional(),
  max_num_terms: integer.describe('The maximum number of terms that must be returned per field.').optional(),
  max_term_freq: integer.describe('Ignore words with more than this frequency in the source doc. It defaults to unbounded.').optional(),
  max_word_length: integer.describe('The maximum word length above which words will be ignored. Defaults to unbounded.').optional(),
  min_doc_freq: integer.describe('Ignore terms which do not occur in at least this many docs.').optional(),
  min_term_freq: integer.describe('Ignore words with less than this frequency in the source doc.').optional(),
  min_word_length: integer.describe('The minimum word length below which words will be ignored.').optional()
}).meta({ id: 'TermvectorsFilter' })
export type TermvectorsFilter = z.infer<typeof TermvectorsFilter>

/** Only to be used in query and path parameters, as the array form is actually a csv */
export const Routing = z.union([z.string(), z.array(z.string())]).meta({ id: 'Routing' })
export type Routing = z.infer<typeof Routing>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const VersionType = z.enum(['internal', 'external', 'external_gte']).meta({ id: 'VersionType' })
export type VersionType = z.infer<typeof VersionType>

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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

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

export const TermvectorsFieldStatistics = z.object({
  doc_count: integer,
  sum_doc_freq: long,
  sum_ttf: long
}).meta({ id: 'TermvectorsFieldStatistics' })
export type TermvectorsFieldStatistics = z.infer<typeof TermvectorsFieldStatistics>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const TermvectorsToken = z.object({
  end_offset: integer.optional(),
  payload: z.string().optional(),
  position: integer,
  start_offset: integer.optional()
}).meta({ id: 'TermvectorsToken' })
export type TermvectorsToken = z.infer<typeof TermvectorsToken>

export const TermvectorsTerm = z.object({
  doc_freq: integer.optional(),
  score: double.optional(),
  term_freq: integer,
  tokens: z.array(TermvectorsToken).optional(),
  ttf: integer.optional()
}).meta({ id: 'TermvectorsTerm' })
export type TermvectorsTerm = z.infer<typeof TermvectorsTerm>

export const TermvectorsTermVector = z.object({
  field_statistics: TermvectorsFieldStatistics.optional(),
  terms: z.record(z.string(), TermvectorsTerm)
}).meta({ id: 'TermvectorsTermVector' })
export type TermvectorsTermVector = z.infer<typeof TermvectorsTermVector>

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

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
