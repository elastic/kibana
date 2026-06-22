/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ExpandWildcards, Id, IndexName, Indices, RequestBase, SearchType, double, integer } from './_types'
import { QueryDslQueryContainer } from './_types.query_dsl'

export const RankEvalDocumentRating = z.object({
  _id: Id.describe('The document ID.'),
  _index: IndexName.describe('The document’s index. For data streams, this should be the document’s backing index.'),
  rating: integer.describe('The document’s relevance with regard to this search request.')
}).meta({ id: 'RankEvalDocumentRating' })
export type RankEvalDocumentRating = z.infer<typeof RankEvalDocumentRating>

export const RankEvalRankEvalHit = z.object({
  _id: Id,
  _index: IndexName,
  _score: double
}).meta({ id: 'RankEvalRankEvalHit' })
export type RankEvalRankEvalHit = z.infer<typeof RankEvalRankEvalHit>

export const RankEvalRankEvalHitItem = z.object({
  hit: RankEvalRankEvalHit,
  rating: z.union([double, z.null()]).optional()
}).meta({ id: 'RankEvalRankEvalHitItem' })
export type RankEvalRankEvalHitItem = z.infer<typeof RankEvalRankEvalHitItem>

export const RankEvalRankEvalMetricBase = z.object({
  k: integer.describe('Sets the maximum number of documents retrieved per query. This value will act in place of the usual size parameter in the query.').optional()
}).meta({ id: 'RankEvalRankEvalMetricBase' })
export type RankEvalRankEvalMetricBase = z.infer<typeof RankEvalRankEvalMetricBase>

export const RankEvalRankEvalMetricRatingTreshold = z.object({
  ...RankEvalRankEvalMetricBase.shape,
  relevant_rating_threshold: integer.describe('Sets the rating threshold above which documents are considered to be "relevant".').optional()
}).meta({ id: 'RankEvalRankEvalMetricRatingTreshold' })
export type RankEvalRankEvalMetricRatingTreshold = z.infer<typeof RankEvalRankEvalMetricRatingTreshold>

/** Precision at K (P@k) */
export const RankEvalRankEvalMetricPrecision = z.object({
  ...RankEvalRankEvalMetricRatingTreshold.shape,
  ignore_unlabeled: z.boolean().describe('Controls how unlabeled documents in the search results are counted. If set to true, unlabeled documents are ignored and neither count as relevant or irrelevant. Set to false (the default), they are treated as irrelevant.').optional()
}).meta({ id: 'RankEvalRankEvalMetricPrecision' })
export type RankEvalRankEvalMetricPrecision = z.infer<typeof RankEvalRankEvalMetricPrecision>

/** Recall at K (R@k) */
export const RankEvalRankEvalMetricRecall = z.object({
  ...RankEvalRankEvalMetricRatingTreshold.shape
}).meta({ id: 'RankEvalRankEvalMetricRecall' })
export type RankEvalRankEvalMetricRecall = z.infer<typeof RankEvalRankEvalMetricRecall>

/** Mean Reciprocal Rank */
export const RankEvalRankEvalMetricMeanReciprocalRank = z.object({
  ...RankEvalRankEvalMetricRatingTreshold.shape
}).meta({ id: 'RankEvalRankEvalMetricMeanReciprocalRank' })
export type RankEvalRankEvalMetricMeanReciprocalRank = z.infer<typeof RankEvalRankEvalMetricMeanReciprocalRank>

/** Discounted cumulative gain (DCG) */
export const RankEvalRankEvalMetricDiscountedCumulativeGain = z.object({
  ...RankEvalRankEvalMetricBase.shape,
  normalize: z.boolean().describe('If set to true, this metric will calculate the Normalized DCG.').optional()
}).meta({ id: 'RankEvalRankEvalMetricDiscountedCumulativeGain' })
export type RankEvalRankEvalMetricDiscountedCumulativeGain = z.infer<typeof RankEvalRankEvalMetricDiscountedCumulativeGain>

/** Expected Reciprocal Rank (ERR) */
export const RankEvalRankEvalMetricExpectedReciprocalRank = z.object({
  ...RankEvalRankEvalMetricBase.shape,
  maximum_relevance: integer.describe('The highest relevance grade used in the user-supplied relevance judgments.')
}).meta({ id: 'RankEvalRankEvalMetricExpectedReciprocalRank' })
export type RankEvalRankEvalMetricExpectedReciprocalRank = z.infer<typeof RankEvalRankEvalMetricExpectedReciprocalRank>

export const RankEvalRankEvalMetric = z.object({
  precision: RankEvalRankEvalMetricPrecision.optional(),
  recall: RankEvalRankEvalMetricRecall.optional(),
  mean_reciprocal_rank: RankEvalRankEvalMetricMeanReciprocalRank.optional(),
  dcg: RankEvalRankEvalMetricDiscountedCumulativeGain.optional(),
  expected_reciprocal_rank: RankEvalRankEvalMetricExpectedReciprocalRank.optional()
}).meta({ id: 'RankEvalRankEvalMetric' })
export type RankEvalRankEvalMetric = z.infer<typeof RankEvalRankEvalMetric>

export const RankEvalUnratedDocument = z.object({
  _id: Id,
  _index: IndexName
}).meta({ id: 'RankEvalUnratedDocument' })
export type RankEvalUnratedDocument = z.infer<typeof RankEvalUnratedDocument>

export const RankEvalRankEvalMetricDetail = z.object({
  metric_score: double.describe('The metric_score in the details section shows the contribution of this query to the global quality metric score'),
  unrated_docs: z.array(RankEvalUnratedDocument).describe('The unrated_docs section contains an _index and _id entry for each document in the search result for this query that didn’t have a ratings value. This can be used to ask the user to supply ratings for these documents'),
  hits: z.array(RankEvalRankEvalHitItem).describe('The hits section shows a grouping of the search results with their supplied ratings'),
  metric_details: z.record(z.string(), z.record(z.string(), z.any())).describe('The metric_details give additional information about the calculated quality metric (e.g. how many of the retrieved documents were relevant). The content varies for each metric but allows for better interpretation of the results')
}).meta({ id: 'RankEvalRankEvalMetricDetail' })
export type RankEvalRankEvalMetricDetail = z.infer<typeof RankEvalRankEvalMetricDetail>

export const RankEvalRankEvalQuery = z.object({
  query: z.lazy(() => QueryDslQueryContainer),
  size: integer.optional()
}).meta({ id: 'RankEvalRankEvalQuery' })
export type RankEvalRankEvalQuery = z.infer<typeof RankEvalRankEvalQuery>

export const RankEvalRankEvalRequestItem = z.object({
  id: Id.describe('The search request’s ID, used to group result details later.'),
  request: RankEvalRankEvalQuery.describe('The query being evaluated.').optional(),
  ratings: z.array(RankEvalDocumentRating).describe('List of document ratings'),
  template_id: Id.describe('The search template Id').optional(),
  params: z.record(z.string(), z.any()).describe('The search template parameters.').optional()
}).meta({ id: 'RankEvalRankEvalRequestItem' })
export type RankEvalRankEvalRequestItem = z.infer<typeof RankEvalRankEvalRequestItem>

/**
 * Evaluate ranked search results.
 *
 * Evaluate the quality of ranked search results over a set of typical search queries.
 */
export const RankEvalRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A  comma-separated list of data streams, indices, and index aliases used to limit the request. Wildcard (`*`) expressions are supported. To target all data streams and indices in a cluster, omit this parameter or use `_all` or `*`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Whether to expand wildcard expression to concrete indices that are open, closed or both.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  search_type: SearchType.describe('Search operation type').optional().meta({ found_in: 'query' }),
  requests: z.array(RankEvalRankEvalRequestItem).describe('A set of typical search requests, together with their provided ratings.').meta({ found_in: 'body' }),
  metric: RankEvalRankEvalMetric.describe('Definition of the evaluation metric to calculate.').optional().meta({ found_in: 'body' })
}).meta({ id: 'RankEvalRequest' })
export type RankEvalRequest = z.infer<typeof RankEvalRequest>

export const RankEvalResponse = z.object({
  metric_score: double.describe('The overall evaluation quality calculated by the defined metric'),
  details: z.record(Id, RankEvalRankEvalMetricDetail).describe('The details section contains one entry for every query in the original requests section, keyed by the search request id'),
  failures: z.record(z.string(), z.any())
}).meta({ id: 'RankEvalResponse' })
export type RankEvalResponse = z.infer<typeof RankEvalResponse>
