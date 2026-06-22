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

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const TermvectorsFieldStatistics = z.object({
  doc_count: integer,
  sum_doc_freq: long,
  sum_ttf: long
}).meta({ id: 'TermvectorsFieldStatistics' })
export type TermvectorsFieldStatistics = z.infer<typeof TermvectorsFieldStatistics>

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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

/** Only to be used in query and path parameters, as the array form is actually a csv */
export const Routing = z.union([z.string(), z.array(z.string())]).meta({ id: 'Routing' })
export type Routing = z.infer<typeof Routing>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const VersionType = z.enum(['internal', 'external', 'external_gte']).meta({ id: 'VersionType' })
export type VersionType = z.infer<typeof VersionType>

/**
 * Get term vector information.
 *
 * Get information and statistics about terms in the fields of a particular document.
 *
 * You can retrieve term vectors for documents stored in the index or for artificial documents passed in the body of the request.
 * You can specify the fields you are interested in through the `fields` parameter or by adding the fields to the request body.
 * For example:
 *
 * ```
 * GET /my-index-000001/_termvectors/1?fields=message
 * ```
 *
 * Fields can be specified using wildcards, similar to the multi match query.
 *
 * Term vectors are real-time by default, not near real-time.
 * This can be changed by setting `realtime` parameter to `false`.
 *
 * You can request three types of values: _term information_, _term statistics_, and _field statistics_.
 * By default, all term information and field statistics are returned for all fields but term statistics are excluded.
 *
 * **Term information**
 *
 * * term frequency in the field (always returned)
 * * term positions (`positions: true`)
 * * start and end offsets (`offsets: true`)
 * * term payloads (`payloads: true`), as base64 encoded bytes
 *
 * If the requested information wasn't stored in the index, it will be computed on the fly if possible.
 * Additionally, term vectors could be computed for documents not even existing in the index, but instead provided by the user.
 *
 * > warn
 * > Start and end offsets assume UTF-16 encoding is being used. If you want to use these offsets in order to get the original text that produced this token, you should make sure that the string you are taking a sub-string of is also encoded using UTF-16.
 *
 * **Behaviour**
 *
 * The term and field statistics are not accurate.
 * Deleted documents are not taken into account.
 * The information is only retrieved for the shard the requested document resides in.
 * The term and field statistics are therefore only useful as relative measures whereas the absolute numbers have no meaning in this context.
 * By default, when requesting term vectors of artificial documents, a shard to get the statistics from is randomly selected.
 * Use `routing` only to hit a particular shard.
 * Refer to the linked documentation for detailed examples of how to use this API.
 */
export const TermvectorsRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the index that contains the document.').meta({ found_in: 'path' }),
  id: Id.describe('A unique identifier for the document.').optional().meta({ found_in: 'path' }),
  preference: z.string().describe('The node or shard the operation should be performed on. It is random by default.').optional().meta({ found_in: 'query' }),
  realtime: z.boolean().describe('If true, the request is real-time as opposed to near-real-time.').optional().meta({ found_in: 'query' }),
  doc: z.any().describe('An artificial document (a document not present in the index) for which you want to retrieve term vectors.').optional().meta({ found_in: 'body' }),
  filter: TermvectorsFilter.describe('Filter terms based on their tf-idf scores. This could be useful in order find out a good characteristic vector of a document. This feature works in a similar manner to the second phase of the More Like This Query.').optional().meta({ found_in: 'body' }),
  per_field_analyzer: z.record(Field, z.string()).describe('Override the default per-field analyzer. This is useful in order to generate term vectors in any fashion, especially when using artificial documents. When providing an analyzer for a field that already stores term vectors, the term vectors will be regenerated.').optional().meta({ found_in: 'body' }),
  fields: z.array(Field).describe('A list of fields to include in the statistics. It is used as the default list unless a specific field list is provided in the `completion_fields` or `fielddata_fields` parameters.').optional().meta({ found_in: 'body' }),
  field_statistics: z.boolean().describe('If `true`, the response includes: * The document count (how many documents contain this field). * The sum of document frequencies (the sum of document frequencies for all terms in this field). * The sum of total term frequencies (the sum of total term frequencies of each term in this field).').optional().meta({ found_in: 'body' }),
  offsets: z.boolean().describe('If `true`, the response includes term offsets.').optional().meta({ found_in: 'body' }),
  payloads: z.boolean().describe('If `true`, the response includes term payloads.').optional().meta({ found_in: 'body' }),
  positions: z.boolean().describe('If `true`, the response includes term positions.').optional().meta({ found_in: 'body' }),
  term_statistics: z.boolean().describe('If `true`, the response includes: * The total term frequency (how often a term occurs in all documents). * The document frequency (the number of documents containing the current term). By default these values are not returned since term statistics can have a serious performance impact.').optional().meta({ found_in: 'body' }),
  routing: Routing.describe('A custom value that is used to route operations to a specific shard.').optional().meta({ found_in: 'body' }),
  version: VersionNumber.describe('If `true`, returns the document version as part of a hit.').optional().meta({ found_in: 'body' }),
  version_type: VersionType.describe('The version type.').optional().meta({ found_in: 'body' })
}).meta({ id: 'TermvectorsRequest' })
export type TermvectorsRequest = z.infer<typeof TermvectorsRequest>

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

export const TermvectorsResponse = z.object({
  found: z.boolean(),
  _id: Id.optional(),
  _index: IndexName,
  term_vectors: z.record(Field, TermvectorsTermVector).optional(),
  took: long,
  _version: VersionNumber
}).meta({ id: 'TermvectorsResponse' })
export type TermvectorsResponse = z.infer<typeof TermvectorsResponse>
