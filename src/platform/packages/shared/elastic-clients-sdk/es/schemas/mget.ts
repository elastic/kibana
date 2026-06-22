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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SequenceNumber = long.meta({ id: 'SequenceNumber' })
export type SequenceNumber = z.infer<typeof SequenceNumber>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const GetGetResult = z.object({
  _index: IndexName.describe('The name of the index the document belongs to.'),
  fields: z.record(z.string(), z.any()).describe('If the `stored_fields` parameter is set to `true` and `found` is `true`, it contains the document fields stored in the index.').optional(),
  _ignored: z.array(z.string()).optional(),
  found: z.boolean().describe('Indicates whether the document exists.'),
  _id: Id.describe('The unique identifier for the document.'),
  _primary_term: long.describe('The primary term assigned to the document for the indexing operation.').optional(),
  _routing: z.string().describe('The explicit routing, if set.').optional(),
  _seq_no: SequenceNumber.describe('The sequence number assigned to the document for the indexing operation. Sequence numbers are used to ensure an older version of a document doesn\'t overwrite a newer version.').optional(),
  _source: z.any().describe('If `found` is `true`, it contains the document data formatted in JSON. If the `_source` parameter is set to `false` or the `stored_fields` parameter is set to `true`, it is excluded.').optional(),
  _version: VersionNumber.describe('The document version, which is ncremented each time the document is updated.').optional()
}).meta({ id: 'GetGetResult' })
export type GetGetResult = z.infer<typeof GetGetResult>

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

export const MgetMultiGetError = z.object({
  error: z.lazy(() => ErrorCause),
  _id: Id,
  _index: IndexName
}).meta({ id: 'MgetMultiGetError' })
export type MgetMultiGetError = z.infer<typeof MgetMultiGetError>

/** Only to be used in query and path parameters, as the array form is actually a csv */
export const Routing = z.union([z.string(), z.array(z.string())]).meta({ id: 'Routing' })
export type Routing = z.infer<typeof Routing>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

export const SearchSourceFilter = z.object({
  exclude_vectors: z.boolean().describe('If `true`, vector fields are excluded from the returned source. This option takes precedence over `includes`: any vector field will remain excluded even if it matches an `includes` rule.').optional(),
  excludes: Fields.describe('A list of fields to exclude from the returned source.').optional(),
  exclude: Fields.describe('A list of fields to exclude from the returned source.').optional(),
  includes: Fields.describe('A list of fields to include in the returned source.').optional(),
  include: Fields.describe('A list of fields to include in the returned source.').optional()
}).meta({ id: 'SearchSourceFilter' })
export type SearchSourceFilter = z.infer<typeof SearchSourceFilter>

/** Defines how to fetch a source. Fetching can be disabled entirely, or the source can be filtered. */
export const SearchSourceConfig = z.union([z.boolean(), SearchSourceFilter]).meta({ id: 'SearchSourceConfig' })
export type SearchSourceConfig = z.infer<typeof SearchSourceConfig>

export const VersionType = z.enum(['internal', 'external', 'external_gte']).meta({ id: 'VersionType' })
export type VersionType = z.infer<typeof VersionType>

export const MgetOperation = z.object({
  _id: Id.describe('The unique document ID.'),
  _index: IndexName.describe('The index that contains the document.').optional(),
  routing: Routing.describe('The key for the primary shard the document resides on. Required if routing is used during indexing.').optional(),
  _source: SearchSourceConfig.describe('If `false`, excludes all _source fields.').optional(),
  stored_fields: Fields.describe('The stored fields you want to retrieve.').optional(),
  version: VersionNumber.optional(),
  version_type: VersionType.optional()
}).meta({ id: 'MgetOperation' })
export type MgetOperation = z.infer<typeof MgetOperation>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Defines how to fetch a source. Fetching can be disabled entirely, or the source can be filtered.
 * Used as a query parameter along with the `_source_includes` and `_source_excludes` parameters.
 */
export const SearchSourceConfigParam = z.union([z.boolean(), Fields]).meta({ id: 'SearchSourceConfigParam' })
export type SearchSourceConfigParam = z.infer<typeof SearchSourceConfigParam>

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

/**
 * Get multiple documents.
 *
 * Get multiple JSON documents by ID from one or more indices.
 * If you specify an index in the request URI, you only need to specify the document IDs in the request body.
 * To ensure fast responses, this multi get (mget) API responds with partial results if one or more shards fail.
 *
 * **Filter source fields**
 *
 * By default, the `_source` field is returned for every document (if stored).
 * Use the `_source` and `_source_include` or `source_exclude` attributes to filter what fields are returned for a particular document.
 * You can include the `_source`, `_source_includes`, and `_source_excludes` query parameters in the request URI to specify the defaults to use when there are no per-document instructions.
 *
 * **Get stored fields**
 *
 * Use the `stored_fields` attribute to specify the set of stored fields you want to retrieve.
 * Any requested fields that are not stored are ignored.
 * You can include the `stored_fields` query parameter in the request URI to specify the defaults to use when there are no per-document instructions.
 */
export const MgetRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the index to retrieve documents from when `ids` are specified, or when a document in the `docs` array does not specify an index.').optional().meta({ found_in: 'path' }),
  preference: z.string().describe('Specifies the node or shard the operation should be performed on. Random by default.').optional().meta({ found_in: 'query' }),
  realtime: z.boolean().describe('If `true`, the request is real-time as opposed to near-real-time.').optional().meta({ found_in: 'query' }),
  refresh: z.boolean().describe('If `true`, the request refreshes relevant shards before retrieving documents.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('Custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  _source: SearchSourceConfigParam.describe('True or false to return the `_source` field or not, or a list of fields to return.').optional().meta({ found_in: 'query' }),
  _source_excludes: Fields.describe('A comma-separated list of source fields to exclude from the response. You can also use this parameter to exclude fields from the subset specified in `_source_includes` query parameter.').optional().meta({ found_in: 'query' }),
  _source_includes: Fields.describe('A comma-separated list of source fields to include in the response. If this parameter is specified, only these source fields are returned. You can exclude fields from this subset using the `_source_excludes` query parameter. If the `_source` parameter is `false`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  stored_fields: Fields.describe('If `true`, retrieves the document fields stored in the index rather than the document `_source`.').optional().meta({ found_in: 'query' }),
  docs: z.array(MgetOperation).describe('The documents you want to retrieve. Required if no index is specified in the request URI.').optional().meta({ found_in: 'body' }),
  ids: Ids.describe('The IDs of the documents you want to retrieve. Allowed when the index is specified in the request URI.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MgetRequest' })
export type MgetRequest = z.infer<typeof MgetRequest>

export const MgetResponseItem = z.union([GetGetResult, MgetMultiGetError]).meta({ id: 'MgetResponseItem' })
export type MgetResponseItem = z.infer<typeof MgetResponseItem>

export const MgetResponse = z.object({
  docs: z.array(MgetResponseItem).describe('The response includes a docs array that contains the documents in the order specified in the request. The structure of the returned documents is similar to that returned by the get API. If there is a failure getting a particular document, the error is included in place of the document.')
}).meta({ id: 'MgetResponse' })
export type MgetResponse = z.infer<typeof MgetResponse>
