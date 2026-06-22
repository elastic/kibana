/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { InnerRetriever, RRFRetrieverEntry, RetrieverContainer, Script, SearchFieldCollapse, SearchInnerHits } from './_global.search'
import type { InnerRetrieverShape, RRFRetrieverEntryShape, RetrieverContainerShape, ScriptShape, SearchFieldCollapseShape, SearchInnerHitsShape } from './_global.search'
import { SpecUtilsPipeSeparatedFlags } from './_spec_utils'
import { DateFormat, Distance, DistanceUnit, DiversifyRetrieverTypes, Field, FieldValue, Fields, Fuzziness, GeoDistanceType, GeoHash, GeoHexCell, GeoLocation, GeoShape, GeoShapeRelation, GeoTile, Id, Ids, IndexName, MinimumShouldMatch, MultiTermQueryRewrite, QueryVector, QueryVectorBuilder, RelationName, RescoreVector, Routing, ScoreNormalizer, ScoreSort, ScriptSortType, SortMode, SortOrder, SortResults, SpecifiedDocument, TimeZone, TokenPruningConfig, VersionNumber, VersionType, double, float, integer, long } from './_types'
import { AnalysisStopWords } from './_types.analysis'
import { ChunkRescorer } from './_types.mapping'

export const QueryDslQueryBase = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional()
}).meta({ id: 'QueryDslQueryBase' })
export type QueryDslQueryBase = z.infer<typeof QueryDslQueryBase>

export interface QueryDslBoolQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  minimum_should_match?: MinimumShouldMatch | undefined
  must?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  must_not?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  should?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
}
export const QueryDslBoolQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('The clause (query) must appear in matching documents. However, unlike `must`, the score of the query will be ignored.').optional() },
  minimum_should_match: MinimumShouldMatch.describe('Specifies the number or percentage of `should` clauses returned documents must match.').optional(),
  get must (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('The clause (query) must appear in matching documents and will contribute to the score.').optional() },
  get must_not (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('The clause (query) must not appear in the matching documents. Because scoring is ignored, a score of `0` is returned for all documents.').optional() },
  get should (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('The clause (query) should appear in the matching document.').optional() }
}).meta({ id: 'QueryDslBoolQuery' })
export type QueryDslBoolQuery = z.infer<typeof QueryDslBoolQuery>

export interface QueryDslBoostingQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  negative_boost: double
  negative: QueryDslQueryContainerShape
  positive: QueryDslQueryContainerShape
}
export const QueryDslBoostingQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  negative_boost: double.describe('Floating point number between 0 and 1.0 used to decrease the relevance scores of documents matching the `negative` query.'),
  get negative () { return QueryDslQueryContainer.describe('Query used to decrease the relevance score of matching documents.') },
  get positive () { return QueryDslQueryContainer.describe('Any returned documents must match this query.') }
}).meta({ id: 'QueryDslBoostingQuery' })
export type QueryDslBoostingQuery = z.infer<typeof QueryDslBoostingQuery>

export const QueryDslOperator = z.enum(['and', 'AND', 'or', 'OR']).meta({ id: 'QueryDslOperator' })
export type QueryDslOperator = z.infer<typeof QueryDslOperator>

export const QueryDslCommonTermsQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().optional(),
  cutoff_frequency: double.optional(),
  high_freq_operator: z.lazy(() => QueryDslOperator).optional(),
  low_freq_operator: z.lazy(() => QueryDslOperator).optional(),
  minimum_should_match: MinimumShouldMatch.optional(),
  query: z.string()
}).meta({ id: 'QueryDslCommonTermsQuery' })
export type QueryDslCommonTermsQuery = z.infer<typeof QueryDslCommonTermsQuery>

export const QueryDslCombinedFieldsOperator = z.enum(['or', 'and']).meta({ id: 'QueryDslCombinedFieldsOperator' })
export type QueryDslCombinedFieldsOperator = z.infer<typeof QueryDslCombinedFieldsOperator>

export const QueryDslCombinedFieldsZeroTerms = z.enum(['none', 'all']).meta({ id: 'QueryDslCombinedFieldsZeroTerms' })
export type QueryDslCombinedFieldsZeroTerms = z.infer<typeof QueryDslCombinedFieldsZeroTerms>

export const QueryDslCombinedFieldsQuery = z.object({
  ...QueryDslQueryBase.shape,
  fields: z.array(Field).describe('List of fields to search. Field wildcard patterns are allowed. Only `text` fields are supported, and they must all have the same search `analyzer`.'),
  query: z.string().describe('Text to search for in the provided `fields`. The `combined_fields` query analyzes the provided text before performing a search.'),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If true, match phrase queries are automatically created for multi-term synonyms.').optional(),
  operator: QueryDslCombinedFieldsOperator.describe('Boolean logic used to interpret text in the query value.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  zero_terms_query: QueryDslCombinedFieldsZeroTerms.describe('Indicates whether no documents are returned if the analyzer removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslCombinedFieldsQuery' })
export type QueryDslCombinedFieldsQuery = z.infer<typeof QueryDslCombinedFieldsQuery>

export interface QueryDslConstantScoreQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  filter: QueryDslQueryContainerShape
}
export const QueryDslConstantScoreQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get filter () { return QueryDslQueryContainer.describe('Filter query you wish to run. Any returned documents must match this query. Filter queries do not calculate relevance scores. To speed up performance, Elasticsearch automatically caches frequently used filter queries.') }
}).meta({ id: 'QueryDslConstantScoreQuery' })
export type QueryDslConstantScoreQuery = z.infer<typeof QueryDslConstantScoreQuery>

export interface QueryDslDisMaxQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  queries: QueryDslQueryContainerShape[]
  tie_breaker?: double | undefined
}
export const QueryDslDisMaxQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get queries () { return QueryDslQueryContainer.array().describe('One or more query clauses. Returned documents must match one or more of these queries. If a document matches multiple queries, Elasticsearch uses the highest relevance score.') },
  tie_breaker: double.describe('Floating point number between 0 and 1.0 used to increase the relevance scores of documents matching multiple query clauses.').optional()
}).meta({ id: 'QueryDslDisMaxQuery' })
export type QueryDslDisMaxQuery = z.infer<typeof QueryDslDisMaxQuery>

export const QueryDslDistanceFeatureQueryBase = z.object({
  ...QueryDslQueryBase.shape,
  origin: z.any().describe('Date or point of origin used to calculate distances. If the `field` value is a `date` or `date_nanos` field, the `origin` value must be a date. Date Math, such as `now-1h`, is supported. If the field value is a `geo_point` field, the `origin` value must be a geopoint.'),
  pivot: z.any().describe('Distance from the `origin` at which relevance scores receive half of the `boost` value. If the `field` value is a `date` or `date_nanos` field, the `pivot` value must be a time unit, such as `1h` or `10d`. If the `field` value is a `geo_point` field, the `pivot` value must be a distance unit, such as `1km` or `12m`.'),
  field: Field.describe('Name of the field used to calculate distances. This field must meet the following criteria: be a `date`, `date_nanos` or `geo_point` field; have an `index` mapping parameter value of `true`, which is the default; have an `doc_values` mapping parameter value of `true`, which is the default.')
}).meta({ id: 'QueryDslDistanceFeatureQueryBase' })
export type QueryDslDistanceFeatureQueryBase = z.infer<typeof QueryDslDistanceFeatureQueryBase>

export const QueryDslUntypedDistanceFeatureQuery = z.object({
  ...QueryDslDistanceFeatureQueryBase.shape
}).meta({ id: 'QueryDslUntypedDistanceFeatureQuery' })
export type QueryDslUntypedDistanceFeatureQuery = z.infer<typeof QueryDslUntypedDistanceFeatureQuery>

export const QueryDslGeoDistanceFeatureQuery = z.object({
  ...QueryDslDistanceFeatureQueryBase.shape
}).meta({ id: 'QueryDslGeoDistanceFeatureQuery' })
export type QueryDslGeoDistanceFeatureQuery = z.infer<typeof QueryDslGeoDistanceFeatureQuery>

export const QueryDslDateDistanceFeatureQuery = z.object({
  ...QueryDslDistanceFeatureQueryBase.shape
}).meta({ id: 'QueryDslDateDistanceFeatureQuery' })
export type QueryDslDateDistanceFeatureQuery = z.infer<typeof QueryDslDateDistanceFeatureQuery>

export const QueryDslDistanceFeatureQuery = z.union([QueryDslUntypedDistanceFeatureQuery, QueryDslGeoDistanceFeatureQuery, QueryDslDateDistanceFeatureQuery]).meta({ id: 'QueryDslDistanceFeatureQuery' })
export type QueryDslDistanceFeatureQuery = z.infer<typeof QueryDslDistanceFeatureQuery>

export const QueryDslExistsQuery = z.object({
  ...QueryDslQueryBase.shape,
  field: Field.describe('Name of the field you wish to search.')
}).meta({ id: 'QueryDslExistsQuery' })
export type QueryDslExistsQuery = z.infer<typeof QueryDslExistsQuery>

export const QueryDslFunctionBoostMode = z.enum(['multiply', 'replace', 'sum', 'avg', 'max', 'min']).meta({ id: 'QueryDslFunctionBoostMode' })
export type QueryDslFunctionBoostMode = z.infer<typeof QueryDslFunctionBoostMode>

export const QueryDslMultiValueMode = z.enum(['min', 'max', 'avg', 'sum']).meta({ id: 'QueryDslMultiValueMode' })
export type QueryDslMultiValueMode = z.infer<typeof QueryDslMultiValueMode>

export const QueryDslDecayFunctionBase = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).meta({ id: 'QueryDslDecayFunctionBase' })
export type QueryDslDecayFunctionBase = z.infer<typeof QueryDslDecayFunctionBase>

export const QueryDslUntypedDecayFunction = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslUntypedDecayFunction' })
export type QueryDslUntypedDecayFunction = z.infer<typeof QueryDslUntypedDecayFunction>

export const QueryDslDateDecayFunction = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslDateDecayFunction' })
export type QueryDslDateDecayFunction = z.infer<typeof QueryDslDateDecayFunction>

export const QueryDslNumericDecayFunction = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslNumericDecayFunction' })
export type QueryDslNumericDecayFunction = z.infer<typeof QueryDslNumericDecayFunction>

export const QueryDslGeoDecayFunction = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoDecayFunction' })
export type QueryDslGeoDecayFunction = z.infer<typeof QueryDslGeoDecayFunction>

export const QueryDslDecayFunction = z.union([QueryDslUntypedDecayFunction, QueryDslDateDecayFunction, QueryDslNumericDecayFunction, QueryDslGeoDecayFunction]).meta({ id: 'QueryDslDecayFunction' })
export type QueryDslDecayFunction = z.infer<typeof QueryDslDecayFunction>

export const QueryDslFieldValueFactorModifier = z.enum(['none', 'log', 'log1p', 'log2p', 'ln', 'ln1p', 'ln2p', 'square', 'sqrt', 'reciprocal']).meta({ id: 'QueryDslFieldValueFactorModifier' })
export type QueryDslFieldValueFactorModifier = z.infer<typeof QueryDslFieldValueFactorModifier>

export const QueryDslFieldValueFactorScoreFunction = z.object({
  field: Field.describe('Field to be extracted from the document.'),
  factor: double.describe('Optional factor to multiply the field value with.').optional(),
  missing: double.describe('Value used if the document doesn’t have that field. The modifier and factor are still applied to it as though it were read from the document.').optional(),
  modifier: QueryDslFieldValueFactorModifier.describe('Modifier to apply to the field value.').optional()
}).meta({ id: 'QueryDslFieldValueFactorScoreFunction' })
export type QueryDslFieldValueFactorScoreFunction = z.infer<typeof QueryDslFieldValueFactorScoreFunction>

export const QueryDslRandomScoreFunction = z.object({
  field: Field.optional(),
  seed: z.union([long, z.string()]).optional()
}).meta({ id: 'QueryDslRandomScoreFunction' })
export type QueryDslRandomScoreFunction = z.infer<typeof QueryDslRandomScoreFunction>

export interface QueryDslScriptScoreFunctionShape {
  script: ScriptShape
}
export const QueryDslScriptScoreFunction = z.object({
  get script () { return Script.describe('A script that computes a score.') }
}).meta({ id: 'QueryDslScriptScoreFunction' })
export type QueryDslScriptScoreFunction = z.infer<typeof QueryDslScriptScoreFunction>

const QueryDslFunctionScoreContainerCommonProps = z.object({
  filter: z.lazy(() => QueryDslQueryContainer).optional(),
  weight: double.optional()
})

const QueryDslFunctionScoreContainerExclusiveProps = z.union([z.object({ exp: QueryDslDecayFunction }), z.object({ gauss: QueryDslDecayFunction }), z.object({ linear: QueryDslDecayFunction }), z.object({ field_value_factor: QueryDslFieldValueFactorScoreFunction }), z.object({ random_score: QueryDslRandomScoreFunction }), z.object({ script_score: z.lazy(() => QueryDslScriptScoreFunction) })])

export interface QueryDslFunctionScoreContainerShape {
  filter?: QueryDslQueryContainerShape | undefined
  weight?: double | undefined
  exp?: QueryDslDecayFunction | undefined
  gauss?: QueryDslDecayFunction | undefined
  linear?: QueryDslDecayFunction | undefined
  field_value_factor?: QueryDslFieldValueFactorScoreFunction | undefined
  random_score?: QueryDslRandomScoreFunction | undefined
  script_score?: QueryDslScriptScoreFunction | undefined
}
export const QueryDslFunctionScoreContainer: z.ZodType<QueryDslFunctionScoreContainerShape> = QueryDslFunctionScoreContainerCommonProps.and(QueryDslFunctionScoreContainerExclusiveProps).meta({ id: 'QueryDslFunctionScoreContainer' })
export type QueryDslFunctionScoreContainer = z.infer<typeof QueryDslFunctionScoreContainer>

export const QueryDslFunctionScoreMode = z.enum(['multiply', 'sum', 'avg', 'first', 'max', 'min']).meta({ id: 'QueryDslFunctionScoreMode' })
export type QueryDslFunctionScoreMode = z.infer<typeof QueryDslFunctionScoreMode>

export interface QueryDslFunctionScoreQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  boost_mode?: QueryDslFunctionBoostMode | undefined
  functions?: QueryDslFunctionScoreContainerShape[] | undefined
  max_boost?: double | undefined
  min_score?: double | undefined
  query?: QueryDslQueryContainerShape | undefined
  score_mode?: QueryDslFunctionScoreMode | undefined
}
export const QueryDslFunctionScoreQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  boost_mode: QueryDslFunctionBoostMode.describe('Defines how he newly computed score is combined with the score of the query').optional(),
  get functions () { return QueryDslFunctionScoreContainer.array().describe('One or more functions that compute a new score for each document returned by the query.').optional() },
  max_boost: double.describe('Restricts the new score to not exceed the provided limit.').optional(),
  min_score: double.describe('Excludes documents that do not meet the provided score threshold.').optional(),
  get query () { return QueryDslQueryContainer.describe('A query that determines the documents for which a new score is computed.').optional() },
  score_mode: QueryDslFunctionScoreMode.describe('Specifies how the computed scores are combined').optional()
}).meta({ id: 'QueryDslFunctionScoreQuery' })
export type QueryDslFunctionScoreQuery = z.infer<typeof QueryDslFunctionScoreQuery>

export const QueryDslFuzzyQuery = z.object({
  ...QueryDslQueryBase.shape,
  max_expansions: integer.describe('Maximum number of variations created.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged when creating expansions.').optional(),
  rewrite: MultiTermQueryRewrite.describe('Number of beginning characters left unchanged when creating expansions.').optional(),
  transpositions: z.boolean().describe('Indicates whether edits include transpositions of two adjacent characters (for example `ab` to `ba`).').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching.').optional(),
  value: z.union([z.string(), double, z.boolean()]).describe('Term you wish to find in the provided field.')
}).meta({ id: 'QueryDslFuzzyQuery' })
export type QueryDslFuzzyQuery = z.infer<typeof QueryDslFuzzyQuery>

export const QueryDslGeoExecution = z.enum(['memory', 'indexed']).meta({ id: 'QueryDslGeoExecution' })
export type QueryDslGeoExecution = z.infer<typeof QueryDslGeoExecution>

export const QueryDslGeoValidationMethod = z.enum(['coerce', 'ignore_malformed', 'strict']).meta({ id: 'QueryDslGeoValidationMethod' })
export type QueryDslGeoValidationMethod = z.infer<typeof QueryDslGeoValidationMethod>

export const QueryDslGeoBoundingBoxQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  type: QueryDslGeoExecution.optional(),
  validation_method: QueryDslGeoValidationMethod.describe('Set to `IGNORE_MALFORMED` to accept geo points with invalid latitude or longitude. Set to `COERCE` to also try to infer correct latitude or longitude.').optional(),
  ignore_unmapped: z.boolean().describe('Set to `true` to ignore an unmapped field and not match any documents for this query. Set to `false` to throw an exception if the field is not mapped.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoBoundingBoxQuery' })
export type QueryDslGeoBoundingBoxQuery = z.infer<typeof QueryDslGeoBoundingBoxQuery>

export const QueryDslGeoDistanceQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  distance: Distance.describe('The radius of the circle centred on the specified location. Points which fall into this circle are considered to be matches.'),
  distance_type: GeoDistanceType.describe('How to compute the distance. Set to `plane` for a faster calculation that\'s inaccurate on long distances and close to the poles.').optional(),
  validation_method: QueryDslGeoValidationMethod.describe('Set to `IGNORE_MALFORMED` to accept geo points with invalid latitude or longitude. Set to `COERCE` to also try to infer correct latitude or longitude.').optional(),
  ignore_unmapped: z.boolean().describe('Set to `true` to ignore an unmapped field and not match any documents for this query. Set to `false` to throw an exception if the field is not mapped.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoDistanceQuery' })
export type QueryDslGeoDistanceQuery = z.infer<typeof QueryDslGeoDistanceQuery>

const QueryDslGeoGridQueryExclusiveProps = z.union([z.object({ geotile: GeoTile }), z.object({ geohash: GeoHash }), z.object({ geohex: GeoHexCell })])

export const QueryDslGeoGridQuery = QueryDslGeoGridQueryExclusiveProps.meta({ id: 'QueryDslGeoGridQuery' })
export type QueryDslGeoGridQuery = z.infer<typeof QueryDslGeoGridQuery>

export const QueryDslGeoPolygonQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  validation_method: QueryDslGeoValidationMethod.optional(),
  ignore_unmapped: z.boolean().optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoPolygonQuery' })
export type QueryDslGeoPolygonQuery = z.infer<typeof QueryDslGeoPolygonQuery>

export const QueryDslGeoShapeQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('Set to `true` to ignore an unmapped field and not match any documents for this query. Set to `false` to throw an exception if the field is not mapped.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoShapeQuery' })
export type QueryDslGeoShapeQuery = z.infer<typeof QueryDslGeoShapeQuery>

/** A reference to a field with formatting instructions on how to return the value */
export const QueryDslFieldAndFormat = z.object({
  field: Field.describe('A wildcard pattern. The request returns values for field names matching this pattern.'),
  format: z.string().describe('The format in which the values are returned.').optional(),
  include_unmapped: z.boolean().optional()
}).meta({ id: 'QueryDslFieldAndFormat' })
export type QueryDslFieldAndFormat = z.infer<typeof QueryDslFieldAndFormat>

export interface NestedSortValueShape {
  filter?: QueryDslQueryContainerShape | undefined
  max_children?: integer | undefined
  nested?: NestedSortValueShape | undefined
  path: Field
}
export const NestedSortValue = z.object({
  get filter () { return QueryDslQueryContainer.optional() },
  max_children: integer.optional(),
  get nested () { return NestedSortValue.optional() },
  path: Field
}).meta({ id: 'NestedSortValue' })
export type NestedSortValue = z.infer<typeof NestedSortValue>

export interface GeoDistanceSortShape {
  mode?: SortMode | undefined
  distance_type?: GeoDistanceType | undefined
  ignore_unmapped?: boolean | undefined
  order?: SortOrder | undefined
  unit?: DistanceUnit | undefined
  nested?: NestedSortValueShape | undefined
}
export const GeoDistanceSort = z.looseObject({
  mode: SortMode.optional(),
  distance_type: GeoDistanceType.optional(),
  ignore_unmapped: z.boolean().optional(),
  order: SortOrder.optional(),
  unit: DistanceUnit.optional(),
  get nested () { return NestedSortValue.optional() }
}).meta({ id: 'GeoDistanceSort' })
export type GeoDistanceSort = z.infer<typeof GeoDistanceSort>

export interface ScriptSortShape {
  order?: SortOrder | undefined
  script: ScriptShape
  type?: ScriptSortType | undefined
  mode?: SortMode | undefined
  nested?: NestedSortValueShape | undefined
}
export const ScriptSort = z.object({
  order: SortOrder.optional(),
  get script () { return Script },
  type: ScriptSortType.optional(),
  mode: SortMode.optional(),
  get nested () { return NestedSortValue.optional() }
}).meta({ id: 'ScriptSort' })
export type ScriptSort = z.infer<typeof ScriptSort>

export interface SortOptionsShape {
  _score?: ScoreSort | undefined
  _doc?: ScoreSort | undefined
  _geo_distance?: GeoDistanceSortShape | undefined
  _script?: ScriptSortShape | undefined
}
export const SortOptions = z.looseObject({
  _score: ScoreSort.optional(),
  _doc: ScoreSort.optional(),
  get _geo_distance () { return GeoDistanceSort.optional() },
  get _script () { return ScriptSort.optional() }
}).meta({ id: 'SortOptions' })
export type SortOptions = z.infer<typeof SortOptions>

export type SortCombinationsShape = Field | SortOptionsShape
export const SortCombinations: z.ZodType<SortCombinationsShape> = z.union([Field, z.lazy(() => SortOptions)]).meta({ id: 'SortCombinations' })
export type SortCombinations = z.infer<typeof SortCombinations>

export type SortShape = SortCombinationsShape | SortCombinationsShape[]
export const Sort: z.ZodType<SortShape> = z.union([z.lazy(() => SortCombinations), z.array(z.lazy(() => SortCombinations))]).meta({ id: 'Sort' })
export type Sort = z.infer<typeof Sort>

export const QueryDslChildScoreMode = z.enum(['none', 'avg', 'sum', 'max', 'min']).meta({ id: 'QueryDslChildScoreMode' })
export type QueryDslChildScoreMode = z.infer<typeof QueryDslChildScoreMode>

export interface QueryDslHasChildQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  ignore_unmapped?: boolean | undefined
  inner_hits?: SearchInnerHitsShape | undefined
  max_children?: integer | undefined
  min_children?: integer | undefined
  query: QueryDslQueryContainerShape
  score_mode?: QueryDslChildScoreMode | undefined
  type: RelationName
}
export const QueryDslHasChildQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('Indicates whether to ignore an unmapped `type` and not return any documents instead of an error.').optional(),
  get inner_hits () { return SearchInnerHits.describe('If defined, each search hit will contain inner hits.').optional() },
  max_children: integer.describe('Maximum number of child documents that match the query allowed for a returned parent document. If the parent document exceeds this limit, it is excluded from the search results.').optional(),
  min_children: integer.describe('Minimum number of child documents that match the query required to match the query for a returned parent document. If the parent document does not meet this limit, it is excluded from the search results.').optional(),
  get query () { return QueryDslQueryContainer.describe('Query you wish to run on child documents of the `type` field. If a child document matches the search, the query returns the parent document.') },
  score_mode: QueryDslChildScoreMode.describe('Indicates how scores for matching child documents affect the root parent document’s relevance score.').optional(),
  type: RelationName.describe('Name of the child relationship mapped for the `join` field.')
}).meta({ id: 'QueryDslHasChildQuery' })
export type QueryDslHasChildQuery = z.infer<typeof QueryDslHasChildQuery>

export interface QueryDslHasParentQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  ignore_unmapped?: boolean | undefined
  inner_hits?: SearchInnerHitsShape | undefined
  parent_type: RelationName
  query: QueryDslQueryContainerShape
  score?: boolean | undefined
}
export const QueryDslHasParentQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('Indicates whether to ignore an unmapped `parent_type` and not return any documents instead of an error. You can use this parameter to query multiple indices that may not contain the `parent_type`.').optional(),
  get inner_hits () { return SearchInnerHits.describe('If defined, each search hit will contain inner hits.').optional() },
  parent_type: RelationName.describe('Name of the parent relationship mapped for the `join` field.'),
  get query () { return QueryDslQueryContainer.describe('Query you wish to run on parent documents of the `parent_type` field. If a parent document matches the search, the query returns its child documents.') },
  score: z.boolean().describe('Indicates whether the relevance score of a matching parent document is aggregated into its child documents.').optional()
}).meta({ id: 'QueryDslHasParentQuery' })
export type QueryDslHasParentQuery = z.infer<typeof QueryDslHasParentQuery>

export const QueryDslIdsQuery = z.object({
  ...QueryDslQueryBase.shape,
  values: Ids.describe('An array of document IDs.').optional()
}).meta({ id: 'QueryDslIdsQuery' })
export type QueryDslIdsQuery = z.infer<typeof QueryDslIdsQuery>

const QueryDslIntervalsFilterExclusiveProps = z.union([z.object({ after: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ before: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ contained_by: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ containing: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ not_contained_by: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ not_containing: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ not_overlapping: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ overlapping: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ script: z.lazy(() => Script) })])

export interface QueryDslIntervalsFilterShape {
  after?: QueryDslIntervalsContainer | undefined
  before?: QueryDslIntervalsContainer | undefined
  contained_by?: QueryDslIntervalsContainer | undefined
  containing?: QueryDslIntervalsContainer | undefined
  not_contained_by?: QueryDslIntervalsContainer | undefined
  not_containing?: QueryDslIntervalsContainer | undefined
  not_overlapping?: QueryDslIntervalsContainer | undefined
  overlapping?: QueryDslIntervalsContainer | undefined
  script?: Script | undefined
}
export const QueryDslIntervalsFilter: z.ZodType<QueryDslIntervalsFilterShape> = QueryDslIntervalsFilterExclusiveProps.meta({ id: 'QueryDslIntervalsFilter' })
export type QueryDslIntervalsFilter = z.infer<typeof QueryDslIntervalsFilter>

export interface QueryDslIntervalsAnyOfShape {
  intervals: QueryDslIntervalsContainerShape[]
  filter?: QueryDslIntervalsFilterShape | undefined
}
export const QueryDslIntervalsAnyOf = z.object({
  get intervals () { return QueryDslIntervalsContainer.array().describe('An array of rules to match.') },
  get filter () { return QueryDslIntervalsFilter.describe('Rule used to filter returned intervals.').optional() }
}).meta({ id: 'QueryDslIntervalsAnyOf' })
export type QueryDslIntervalsAnyOf = z.infer<typeof QueryDslIntervalsAnyOf>

export const QueryDslIntervalsFuzzy = z.object({
  analyzer: z.string().describe('Analyzer used to normalize the term.').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged when creating expansions.').optional(),
  term: z.string().describe('The term to match.'),
  transpositions: z.boolean().describe('Indicates whether edits include transpositions of two adjacent characters (for example, `ab` to `ba`).').optional(),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `term` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsFuzzy' })
export type QueryDslIntervalsFuzzy = z.infer<typeof QueryDslIntervalsFuzzy>

export interface QueryDslIntervalsMatchShape {
  analyzer?: string | undefined
  max_gaps?: integer | undefined
  ordered?: boolean | undefined
  query: string
  use_field?: Field | undefined
  filter?: QueryDslIntervalsFilterShape | undefined
}
export const QueryDslIntervalsMatch = z.object({
  analyzer: z.string().describe('Analyzer used to analyze terms in the query.').optional(),
  max_gaps: integer.describe('Maximum number of positions between the matching terms. Terms further apart than this are not considered matches.').optional(),
  ordered: z.boolean().describe('If `true`, matching terms must appear in their specified order.').optional(),
  query: z.string().describe('Text you wish to find in the provided field.'),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `term` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional(),
  get filter () { return QueryDslIntervalsFilter.describe('An optional interval filter.').optional() }
}).meta({ id: 'QueryDslIntervalsMatch' })
export type QueryDslIntervalsMatch = z.infer<typeof QueryDslIntervalsMatch>

export const QueryDslIntervalsPrefix = z.object({
  analyzer: z.string().describe('Analyzer used to analyze the `prefix`.').optional(),
  prefix: z.string().describe('Beginning characters of terms you wish to find in the top-level field.'),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `prefix` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsPrefix' })
export type QueryDslIntervalsPrefix = z.infer<typeof QueryDslIntervalsPrefix>

export const QueryDslIntervalsRange = z.object({
  analyzer: z.string().describe('Analyzer used to analyze the `prefix`.').optional(),
  gte: z.string().describe('Lower term, either gte or gt must be provided.').optional(),
  gt: z.string().describe('Lower term, either gte or gt must be provided.').optional(),
  lte: z.string().describe('Upper term, either lte or lt must be provided.').optional(),
  lt: z.string().describe('Upper term, either lte or lt must be provided.').optional(),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `prefix` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsRange' })
export type QueryDslIntervalsRange = z.infer<typeof QueryDslIntervalsRange>

export const QueryDslIntervalsRegexp = z.object({
  analyzer: z.string().describe('Analyzer used to analyze the `prefix`.').optional(),
  pattern: z.string().describe('Regex pattern.'),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `prefix` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsRegexp' })
export type QueryDslIntervalsRegexp = z.infer<typeof QueryDslIntervalsRegexp>

export const QueryDslIntervalsWildcard = z.object({
  analyzer: z.string().describe('Analyzer used to analyze the `pattern`. Defaults to the top-level field\'s analyzer.').optional(),
  pattern: z.string().describe('Wildcard pattern used to find matching terms.'),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `pattern` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsWildcard' })
export type QueryDslIntervalsWildcard = z.infer<typeof QueryDslIntervalsWildcard>

const QueryDslIntervalsContainerExclusiveProps = z.union([z.object({ all_of: z.lazy(() => QueryDslIntervalsAllOf) }), z.object({ any_of: z.lazy(() => QueryDslIntervalsAnyOf) }), z.object({ fuzzy: QueryDslIntervalsFuzzy }), z.object({ match: z.lazy(() => QueryDslIntervalsMatch) }), z.object({ prefix: QueryDslIntervalsPrefix }), z.object({ range: QueryDslIntervalsRange }), z.object({ regexp: QueryDslIntervalsRegexp }), z.object({ wildcard: QueryDslIntervalsWildcard })])

export interface QueryDslIntervalsContainerShape {
  all_of?: QueryDslIntervalsAllOf | undefined
  any_of?: QueryDslIntervalsAnyOf | undefined
  fuzzy?: QueryDslIntervalsFuzzy | undefined
  match?: QueryDslIntervalsMatch | undefined
  prefix?: QueryDslIntervalsPrefix | undefined
  range?: QueryDslIntervalsRange | undefined
  regexp?: QueryDslIntervalsRegexp | undefined
  wildcard?: QueryDslIntervalsWildcard | undefined
}
export const QueryDslIntervalsContainer: z.ZodType<QueryDslIntervalsContainerShape> = QueryDslIntervalsContainerExclusiveProps.meta({ id: 'QueryDslIntervalsContainer' })
export type QueryDslIntervalsContainer = z.infer<typeof QueryDslIntervalsContainer>

export interface QueryDslIntervalsAllOfShape {
  intervals: QueryDslIntervalsContainerShape[]
  max_gaps?: integer | undefined
  ordered?: boolean | undefined
  filter?: QueryDslIntervalsFilterShape | undefined
}
export const QueryDslIntervalsAllOf = z.object({
  get intervals () { return QueryDslIntervalsContainer.array().describe('An array of rules to combine. All rules must produce a match in a document for the overall source to match.') },
  max_gaps: integer.describe('Maximum number of positions between the matching terms. Intervals produced by the rules further apart than this are not considered matches.').optional(),
  ordered: z.boolean().describe('If `true`, intervals produced by the rules should appear in the order in which they are specified.').optional(),
  get filter () { return QueryDslIntervalsFilter.describe('Rule used to filter returned intervals.').optional() }
}).meta({ id: 'QueryDslIntervalsAllOf' })
export type QueryDslIntervalsAllOf = z.infer<typeof QueryDslIntervalsAllOf>

const QueryDslIntervalsQueryExclusiveProps = z.union([z.object({ all_of: z.lazy(() => QueryDslIntervalsAllOf) }), z.object({ any_of: z.lazy(() => QueryDslIntervalsAnyOf) }), z.object({ fuzzy: QueryDslIntervalsFuzzy }), z.object({ match: z.lazy(() => QueryDslIntervalsMatch) }), z.object({ prefix: QueryDslIntervalsPrefix }), z.object({ range: QueryDslIntervalsRange }), z.object({ regexp: QueryDslIntervalsRegexp }), z.object({ wildcard: QueryDslIntervalsWildcard })])

export interface QueryDslIntervalsQueryShape {
  all_of?: QueryDslIntervalsAllOf | undefined
  any_of?: QueryDslIntervalsAnyOf | undefined
  fuzzy?: QueryDslIntervalsFuzzy | undefined
  match?: QueryDslIntervalsMatch | undefined
  prefix?: QueryDslIntervalsPrefix | undefined
  range?: QueryDslIntervalsRange | undefined
  regexp?: QueryDslIntervalsRegexp | undefined
  wildcard?: QueryDslIntervalsWildcard | undefined
}
export const QueryDslIntervalsQuery: z.ZodType<QueryDslIntervalsQueryShape> = QueryDslIntervalsQueryExclusiveProps.meta({ id: 'QueryDslIntervalsQuery' })
export type QueryDslIntervalsQuery = z.infer<typeof QueryDslIntervalsQuery>

export interface KnnQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  field: Field
  query_vector?: QueryVector | undefined
  query_vector_builder?: QueryVectorBuilder | undefined
  num_candidates?: integer | undefined
  visit_percentage?: float | undefined
  k?: integer | undefined
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  similarity?: float | undefined
  rescore_vector?: RescoreVector | undefined
}
export const KnnQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  field: Field.describe('The name of the vector field to search against'),
  query_vector: QueryVector.describe('The query vector').optional(),
  query_vector_builder: QueryVectorBuilder.describe('The query vector builder. You must provide a query_vector_builder or query_vector, but not both.').optional(),
  num_candidates: integer.describe('The number of nearest neighbor candidates to consider per shard').optional(),
  visit_percentage: float.describe('The percentage of vectors to explore per shard while doing knn search with bbq_disk').optional(),
  k: integer.describe('The final number of nearest neighbors to return as top hits').optional(),
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Filters for the kNN search query').optional() },
  similarity: float.describe('The minimum similarity for a vector to be considered a match').optional(),
  rescore_vector: RescoreVector.describe('Apply oversampling and rescoring to quantized vectors').optional()
}).meta({ id: 'KnnQuery' })
export type KnnQuery = z.infer<typeof KnnQuery>

export const QueryDslZeroTermsQuery = z.enum(['all', 'none']).meta({ id: 'QueryDslZeroTermsQuery' })
export type QueryDslZeroTermsQuery = z.infer<typeof QueryDslZeroTermsQuery>

export const QueryDslMatchQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert the text in the query value into tokens.').optional(),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If `true`, match phrase queries are automatically created for multi-term synonyms.').optional(),
  cutoff_frequency: double.optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching.').optional(),
  fuzzy_rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`).').optional(),
  lenient: z.boolean().describe('If `true`, format-based errors, such as providing a text query value for a numeric field, are ignored.').optional(),
  max_expansions: integer.describe('Maximum number of terms to which the query will expand.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  operator: z.lazy(() => QueryDslOperator).describe('Boolean logic used to interpret text in the query value.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching.').optional(),
  query: z.union([z.string(), float, z.boolean()]).describe('Text, number, boolean value or date you wish to find in the provided field.'),
  zero_terms_query: QueryDslZeroTermsQuery.describe('Indicates whether no documents are returned if the `analyzer` removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslMatchQuery' })
export type QueryDslMatchQuery = z.infer<typeof QueryDslMatchQuery>

export const QueryDslMatchAllQuery = z.object({
  ...QueryDslQueryBase.shape
}).meta({ id: 'QueryDslMatchAllQuery' })
export type QueryDslMatchAllQuery = z.infer<typeof QueryDslMatchAllQuery>

export const QueryDslMatchBoolPrefixQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert the text in the query value into tokens.').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching. Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  fuzzy_rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query. Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`). Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  max_expansions: integer.describe('Maximum number of terms to which the query will expand. Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned. Applied to the constructed bool query.').optional(),
  operator: z.lazy(() => QueryDslOperator).describe('Boolean logic used to interpret text in the query value. Applied to the constructed bool query.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching. Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  query: z.string().describe('Terms you wish to find in the provided field. The last term is used in a prefix query.')
}).meta({ id: 'QueryDslMatchBoolPrefixQuery' })
export type QueryDslMatchBoolPrefixQuery = z.infer<typeof QueryDslMatchBoolPrefixQuery>

export const QueryDslMatchNoneQuery = z.object({
  ...QueryDslQueryBase.shape
}).meta({ id: 'QueryDslMatchNoneQuery' })
export type QueryDslMatchNoneQuery = z.infer<typeof QueryDslMatchNoneQuery>

export const QueryDslMatchPhraseQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert the text in the query value into tokens.').optional(),
  query: z.string().describe('Query terms that are analyzed and turned into a phrase query.'),
  slop: integer.describe('Maximum number of positions allowed between matching tokens.').optional(),
  zero_terms_query: QueryDslZeroTermsQuery.describe('Indicates whether no documents are returned if the `analyzer` removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslMatchPhraseQuery' })
export type QueryDslMatchPhraseQuery = z.infer<typeof QueryDslMatchPhraseQuery>

export const QueryDslMatchPhrasePrefixQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert text in the query value into tokens.').optional(),
  max_expansions: integer.describe('Maximum number of terms to which the last provided term of the query value will expand.').optional(),
  query: z.string().describe('Text you wish to find in the provided field.'),
  slop: integer.describe('Maximum number of positions allowed between matching tokens.').optional(),
  zero_terms_query: QueryDslZeroTermsQuery.describe('Indicates whether no documents are returned if the analyzer removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslMatchPhrasePrefixQuery' })
export type QueryDslMatchPhrasePrefixQuery = z.infer<typeof QueryDslMatchPhrasePrefixQuery>

export const QueryDslLikeDocument = z.object({
  doc: z.any().describe('A document not present in the index.').optional(),
  fields: z.array(Field).optional(),
  _id: Id.describe('ID of a document.').optional(),
  _index: IndexName.describe('Index of a document.').optional(),
  per_field_analyzer: z.record(Field, z.string()).describe('Overrides the default analyzer.').optional(),
  routing: Routing.optional(),
  version: VersionNumber.optional(),
  version_type: VersionType.optional()
}).meta({ id: 'QueryDslLikeDocument' })
export type QueryDslLikeDocument = z.infer<typeof QueryDslLikeDocument>

/** Text that we want similar documents for or a lookup to a document's field for the text. */
export const QueryDslLike = z.union([z.string(), QueryDslLikeDocument]).meta({ id: 'QueryDslLike' })
export type QueryDslLike = z.infer<typeof QueryDslLike>

export const QueryDslMoreLikeThisQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('The analyzer that is used to analyze the free form text. Defaults to the analyzer associated with the first field in fields.').optional(),
  boost_terms: double.describe('Each term in the formed query could be further boosted by their tf-idf score. This sets the boost factor to use when using this feature. Defaults to deactivated (0).').optional(),
  fail_on_unsupported_field: z.boolean().describe('Controls whether the query should fail (throw an exception) if any of the specified fields are not of the supported types (`text` or `keyword`).').optional(),
  fields: z.array(Field).describe('A list of fields to fetch and analyze the text from. Defaults to the `index.query.default_field` index setting, which has a default value of `*`.').optional(),
  include: z.boolean().describe('Specifies whether the input documents should also be included in the search results returned.').optional(),
  like: z.union([QueryDslLike, z.array(QueryDslLike)]).describe('Specifies free form text and/or a single or multiple documents for which you want to find similar documents.'),
  max_doc_freq: integer.describe('The maximum document frequency above which the terms are ignored from the input document.').optional(),
  max_query_terms: integer.describe('The maximum number of query terms that can be selected.').optional(),
  max_word_length: integer.describe('The maximum word length above which the terms are ignored. Defaults to unbounded (`0`).').optional(),
  min_doc_freq: integer.describe('The minimum document frequency below which the terms are ignored from the input document.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('After the disjunctive query has been formed, this parameter controls the number of terms that must match.').optional(),
  min_term_freq: integer.describe('The minimum term frequency below which the terms are ignored from the input document.').optional(),
  min_word_length: integer.describe('The minimum word length below which the terms are ignored.').optional(),
  routing: z.string().optional(),
  stop_words: z.lazy(() => AnalysisStopWords).describe('An array of stop words. Any word in this set is ignored.').optional(),
  unlike: z.union([QueryDslLike, z.array(QueryDslLike)]).describe('Used in combination with `like` to exclude documents that match a set of terms.').optional(),
  version: VersionNumber.optional(),
  version_type: VersionType.optional()
}).meta({ id: 'QueryDslMoreLikeThisQuery' })
export type QueryDslMoreLikeThisQuery = z.infer<typeof QueryDslMoreLikeThisQuery>

export const QueryDslTextQueryType = z.enum(['best_fields', 'most_fields', 'cross_fields', 'phrase', 'phrase_prefix', 'bool_prefix']).meta({ id: 'QueryDslTextQueryType' })
export type QueryDslTextQueryType = z.infer<typeof QueryDslTextQueryType>

export const QueryDslMultiMatchQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert the text in the query value into tokens.').optional(),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If `true`, match phrase queries are automatically created for multi-term synonyms.').optional(),
  cutoff_frequency: double.optional(),
  fields: Fields.describe('The fields to be queried. Defaults to the `index.query.default_field` index settings, which in turn defaults to `*`.').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching.').optional(),
  fuzzy_rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`). Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  lenient: z.boolean().describe('If `true`, format-based errors, such as providing a text query value for a numeric field, are ignored.').optional(),
  max_expansions: integer.describe('Maximum number of terms to which the query will expand.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  operator: z.lazy(() => QueryDslOperator).describe('Boolean logic used to interpret text in the query value.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching.').optional(),
  query: z.string().describe('Text, number, boolean value or date you wish to find in the provided field.'),
  slop: integer.describe('Maximum number of positions allowed between matching tokens.').optional(),
  tie_breaker: double.describe('Determines how scores for each per-term blended query and scores across groups are combined.').optional(),
  type: QueryDslTextQueryType.describe('How `the` multi_match query is executed internally.').optional(),
  zero_terms_query: QueryDslZeroTermsQuery.describe('Indicates whether no documents are returned if the `analyzer` removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslMultiMatchQuery' })
export type QueryDslMultiMatchQuery = z.infer<typeof QueryDslMultiMatchQuery>

export interface QueryDslNestedQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  ignore_unmapped?: boolean | undefined
  inner_hits?: SearchInnerHitsShape | undefined
  path: Field
  query: QueryDslQueryContainerShape
  score_mode?: QueryDslChildScoreMode | undefined
}
export const QueryDslNestedQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('Indicates whether to ignore an unmapped path and not return any documents instead of an error.').optional(),
  get inner_hits () { return SearchInnerHits.describe('If defined, each search hit will contain inner hits.').optional() },
  path: Field.describe('Path to the nested object you wish to search.'),
  get query () { return QueryDslQueryContainer.describe('Query you wish to run on nested objects in the path.') },
  score_mode: QueryDslChildScoreMode.describe('How scores for matching child objects affect the root parent document’s relevance score.').optional()
}).meta({ id: 'QueryDslNestedQuery' })
export type QueryDslNestedQuery = z.infer<typeof QueryDslNestedQuery>

export const QueryDslParentIdQuery = z.object({
  ...QueryDslQueryBase.shape,
  id: Id.describe('ID of the parent document.').optional(),
  ignore_unmapped: z.boolean().describe('Indicates whether to ignore an unmapped `type` and not return any documents instead of an error.').optional(),
  type: RelationName.describe('Name of the child relationship mapped for the `join` field.').optional()
}).meta({ id: 'QueryDslParentIdQuery' })
export type QueryDslParentIdQuery = z.infer<typeof QueryDslParentIdQuery>

export const QueryDslPercolateQuery = z.object({
  ...QueryDslQueryBase.shape,
  document: z.any().describe('The source of the document being percolated.').optional(),
  documents: z.array(z.any()).describe('An array of sources of the documents being percolated.').optional(),
  field: Field.describe('Field that holds the indexed queries. The field must use the `percolator` mapping type.'),
  id: Id.describe('The ID of a stored document to percolate.').optional(),
  index: IndexName.describe('The index of a stored document to percolate.').optional(),
  name: z.string().describe('The suffix used for the `_percolator_document_slot` field when multiple `percolate` queries are specified.').optional(),
  preference: z.string().describe('Preference used to fetch document to percolate.').optional(),
  routing: z.string().describe('Routing used to fetch document to percolate.').optional(),
  version: VersionNumber.describe('The expected version of a stored document to percolate.').optional()
}).meta({ id: 'QueryDslPercolateQuery' })
export type QueryDslPercolateQuery = z.infer<typeof QueryDslPercolateQuery>

export const QueryDslPinnedDoc = z.object({
  _id: Id.describe('The unique document ID.'),
  _index: IndexName.describe('The index that contains the document.').optional()
}).meta({ id: 'QueryDslPinnedDoc' })
export type QueryDslPinnedDoc = z.infer<typeof QueryDslPinnedDoc>

const QueryDslPinnedQueryCommonProps = z.object({
  organic: z.lazy(() => QueryDslQueryContainer).describe('Any choice of query used to rank documents which will be ranked below the "pinned" documents.')
})

const QueryDslPinnedQueryExclusiveProps = z.union([z.object({ ids: z.array(Id) }), z.object({ docs: z.array(QueryDslPinnedDoc) })])

export interface QueryDslPinnedQueryShape {
  organic: QueryDslQueryContainerShape
  ids?: Id[] | undefined
  docs?: QueryDslPinnedDoc[] | undefined
}
export const QueryDslPinnedQuery: z.ZodType<QueryDslPinnedQueryShape> = QueryDslPinnedQueryCommonProps.and(QueryDslPinnedQueryExclusiveProps).meta({ id: 'QueryDslPinnedQuery' })
export type QueryDslPinnedQuery = z.infer<typeof QueryDslPinnedQuery>

export const QueryDslPrefixQuery = z.object({
  ...QueryDslQueryBase.shape,
  rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  value: z.string().describe('Beginning characters of terms you wish to find in the provided field.'),
  case_insensitive: z.boolean().describe('Allows ASCII case insensitive matching of the value with the indexed field values when set to `true`. Default is `false` which means the case sensitivity of matching depends on the underlying field’s mapping.').optional()
}).meta({ id: 'QueryDslPrefixQuery' })
export type QueryDslPrefixQuery = z.infer<typeof QueryDslPrefixQuery>

export const QueryDslQueryStringQuery = z.object({
  ...QueryDslQueryBase.shape,
  allow_leading_wildcard: z.boolean().describe('If `true`, the wildcard characters `*` and `?` are allowed as the first character of the query string.').optional(),
  analyzer: z.string().describe('Analyzer used to convert text in the query string into tokens.').optional(),
  analyze_wildcard: z.boolean().describe('If `true`, the query attempts to analyze wildcard terms in the query string.').optional(),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If `true`, match phrase queries are automatically created for multi-term synonyms.').optional(),
  default_field: Field.describe('Default field to search if no field is provided in the query string. Supports wildcards (`*`). Defaults to the `index.query.default_field` index setting, which has a default value of `*`.').optional(),
  default_operator: z.lazy(() => QueryDslOperator).describe('Default boolean logic used to interpret text in the query string if no operators are specified.').optional(),
  enable_position_increments: z.boolean().describe('If `true`, enable position increments in queries constructed from a `query_string` search.').optional(),
  escape: z.boolean().optional(),
  fields: z.array(Field).describe('Array of fields to search. Supports wildcards (`*`).').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for fuzzy matching.').optional(),
  fuzzy_max_expansions: integer.describe('Maximum number of terms to which the query expands for fuzzy matching.').optional(),
  fuzzy_prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching.').optional(),
  fuzzy_rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`).').optional(),
  lenient: z.boolean().describe('If `true`, format-based errors, such as providing a text value for a numeric field, are ignored.').optional(),
  max_determinized_states: integer.describe('Maximum number of automaton states required for the query.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  phrase_slop: double.describe('Maximum number of positions allowed between matching tokens for phrases.').optional(),
  query: z.string().describe('Query string you wish to parse and use for search.'),
  quote_analyzer: z.string().describe('Analyzer used to convert quoted text in the query string into tokens. For quoted text, this parameter overrides the analyzer specified in the `analyzer` parameter.').optional(),
  quote_field_suffix: z.string().describe('Suffix appended to quoted text in the query string. You can use this suffix to use a different analysis method for exact matches.').optional(),
  rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  tie_breaker: double.describe('How to combine the queries generated from the individual search terms in the resulting `dis_max` query.').optional(),
  time_zone: TimeZone.describe('Coordinated Universal Time (UTC) offset or IANA time zone used to convert date values in the query string to UTC.').optional(),
  type: QueryDslTextQueryType.describe('Determines how the query matches and scores documents.').optional()
}).meta({ id: 'QueryDslQueryStringQuery' })
export type QueryDslQueryStringQuery = z.infer<typeof QueryDslQueryStringQuery>

export const QueryDslRangeRelation = z.enum(['within', 'contains', 'intersects']).meta({ id: 'QueryDslRangeRelation' })
export type QueryDslRangeRelation = z.infer<typeof QueryDslRangeRelation>

export const QueryDslRangeQueryBase = z.object({
  ...QueryDslQueryBase.shape,
  relation: QueryDslRangeRelation.describe('Indicates how the range query matches values for `range` fields.').optional(),
  gt: z.any().describe('Greater than.').optional(),
  gte: z.any().describe('Greater than or equal to.').optional(),
  lt: z.any().describe('Less than.').optional(),
  lte: z.any().describe('Less than or equal to.').optional()
}).meta({ id: 'QueryDslRangeQueryBase' })
export type QueryDslRangeQueryBase = z.infer<typeof QueryDslRangeQueryBase>

export const QueryDslUntypedRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape,
  format: DateFormat.describe('Date format used to convert `date` values in the query.').optional(),
  time_zone: TimeZone.describe('Coordinated Universal Time (UTC) offset or IANA time zone used to convert `date` values in the query to UTC.').optional()
}).meta({ id: 'QueryDslUntypedRangeQuery' })
export type QueryDslUntypedRangeQuery = z.infer<typeof QueryDslUntypedRangeQuery>

export const QueryDslDateRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape,
  format: DateFormat.describe('Date format used to convert `date` values in the query.').optional(),
  time_zone: TimeZone.describe('Coordinated Universal Time (UTC) offset or IANA time zone used to convert `date` values in the query to UTC.').optional()
}).meta({ id: 'QueryDslDateRangeQuery' })
export type QueryDslDateRangeQuery = z.infer<typeof QueryDslDateRangeQuery>

export const QueryDslNumberRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape
}).meta({ id: 'QueryDslNumberRangeQuery' })
export type QueryDslNumberRangeQuery = z.infer<typeof QueryDslNumberRangeQuery>

export const QueryDslLongNumberRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape
}).meta({ id: 'QueryDslLongNumberRangeQuery' })
export type QueryDslLongNumberRangeQuery = z.infer<typeof QueryDslLongNumberRangeQuery>

export const QueryDslTermRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape
}).meta({ id: 'QueryDslTermRangeQuery' })
export type QueryDslTermRangeQuery = z.infer<typeof QueryDslTermRangeQuery>

export const QueryDslRangeQuery = z.union([QueryDslUntypedRangeQuery, QueryDslDateRangeQuery, QueryDslNumberRangeQuery, QueryDslLongNumberRangeQuery, QueryDslTermRangeQuery]).meta({ id: 'QueryDslRangeQuery' })
export type QueryDslRangeQuery = z.infer<typeof QueryDslRangeQuery>

export const QueryDslRankFeatureFunction = z.object({
}).meta({ id: 'QueryDslRankFeatureFunction' })
export type QueryDslRankFeatureFunction = z.infer<typeof QueryDslRankFeatureFunction>

export const QueryDslRankFeatureFunctionSaturation = z.object({
  pivot: float.describe('Configurable pivot value so that the result will be less than 0.5.').optional()
}).meta({ id: 'QueryDslRankFeatureFunctionSaturation' })
export type QueryDslRankFeatureFunctionSaturation = z.infer<typeof QueryDslRankFeatureFunctionSaturation>

export const QueryDslRankFeatureFunctionLogarithm = z.object({
  scaling_factor: float.describe('Configurable scaling factor.')
}).meta({ id: 'QueryDslRankFeatureFunctionLogarithm' })
export type QueryDslRankFeatureFunctionLogarithm = z.infer<typeof QueryDslRankFeatureFunctionLogarithm>

export const QueryDslRankFeatureFunctionLinear = z.object({
}).meta({ id: 'QueryDslRankFeatureFunctionLinear' })
export type QueryDslRankFeatureFunctionLinear = z.infer<typeof QueryDslRankFeatureFunctionLinear>

export const QueryDslRankFeatureFunctionSigmoid = z.object({
  pivot: float.describe('Configurable pivot value so that the result will be less than 0.5.'),
  exponent: float.describe('Configurable Exponent.')
}).meta({ id: 'QueryDslRankFeatureFunctionSigmoid' })
export type QueryDslRankFeatureFunctionSigmoid = z.infer<typeof QueryDslRankFeatureFunctionSigmoid>

export const QueryDslRankFeatureQuery = z.object({
  ...QueryDslQueryBase.shape,
  field: Field.describe('`rank_feature` or `rank_features` field used to boost relevance scores.'),
  saturation: QueryDslRankFeatureFunctionSaturation.describe('Saturation function used to boost relevance scores based on the value of the rank feature `field`.').optional(),
  log: QueryDslRankFeatureFunctionLogarithm.describe('Logarithmic function used to boost relevance scores based on the value of the rank feature `field`.').optional(),
  linear: QueryDslRankFeatureFunctionLinear.describe('Linear function used to boost relevance scores based on the value of the rank feature `field`.').optional(),
  sigmoid: QueryDslRankFeatureFunctionSigmoid.describe('Sigmoid function used to boost relevance scores based on the value of the rank feature `field`.').optional()
}).meta({ id: 'QueryDslRankFeatureQuery' })
export type QueryDslRankFeatureQuery = z.infer<typeof QueryDslRankFeatureQuery>

export const QueryDslRegexpQuery = z.object({
  ...QueryDslQueryBase.shape,
  case_insensitive: z.boolean().describe('Allows case insensitive matching of the regular expression value with the indexed field values when set to `true`. When `false`, case sensitivity of matching depends on the underlying field’s mapping.').optional(),
  flags: z.string().describe('Enables optional operators for the regular expression.').optional(),
  max_determinized_states: integer.describe('Maximum number of automaton states required for the query.').optional(),
  rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  value: z.string().describe('Regular expression for terms you wish to find in the provided field.')
}).meta({ id: 'QueryDslRegexpQuery' })
export type QueryDslRegexpQuery = z.infer<typeof QueryDslRegexpQuery>

export interface QueryDslRuleQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  organic: QueryDslQueryContainerShape
  ruleset_ids?: Id | Id[] | undefined
  ruleset_id?: string | undefined
  match_criteria: unknown
}
export const QueryDslRuleQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get organic () { return QueryDslQueryContainer },
  ruleset_ids: z.union([Id, z.array(Id)]).optional(),
  ruleset_id: z.string().optional(),
  match_criteria: z.any()
}).meta({ id: 'QueryDslRuleQuery' })
export type QueryDslRuleQuery = z.infer<typeof QueryDslRuleQuery>

export interface QueryDslScriptQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  script: ScriptShape
}
export const QueryDslScriptQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get script () { return Script.describe('Contains a script to run as a query. This script must return a boolean value, `true` or `false`.') }
}).meta({ id: 'QueryDslScriptQuery' })
export type QueryDslScriptQuery = z.infer<typeof QueryDslScriptQuery>

export interface QueryDslScriptScoreQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  min_score?: float | undefined
  query: QueryDslQueryContainerShape
  script: ScriptShape
}
export const QueryDslScriptScoreQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  min_score: float.describe('Documents with a score lower than this floating point number are excluded from the search results.').optional(),
  get query () { return QueryDslQueryContainer.describe('Query used to return documents.') },
  get script () { return Script.describe('Script used to compute the score of documents returned by the query. Important: final relevance scores from the `script_score` query cannot be negative.') }
}).meta({ id: 'QueryDslScriptScoreQuery' })
export type QueryDslScriptScoreQuery = z.infer<typeof QueryDslScriptScoreQuery>

export const QueryDslSemanticQuery = z.object({
  ...QueryDslQueryBase.shape,
  field: z.string().describe('The field to query, which must be a semantic_text field type'),
  query: z.string().describe('The query text')
}).meta({ id: 'QueryDslSemanticQuery' })
export type QueryDslSemanticQuery = z.infer<typeof QueryDslSemanticQuery>

export const QueryDslShapeQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('When set to `true` the query ignores an unmapped field and will not match any documents.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslShapeQuery' })
export type QueryDslShapeQuery = z.infer<typeof QueryDslShapeQuery>

/** Query flags can be either a single flag or a combination of flags, e.g. `OR|AND|PREFIX` */
export const QueryDslSimpleQueryStringFlags = SpecUtilsPipeSeparatedFlags.meta({ id: 'QueryDslSimpleQueryStringFlags' })
export type QueryDslSimpleQueryStringFlags = z.infer<typeof QueryDslSimpleQueryStringFlags>

export const QueryDslSimpleQueryStringQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert text in the query string into tokens.').optional(),
  analyze_wildcard: z.boolean().describe('If `true`, the query attempts to analyze wildcard terms in the query string.').optional(),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If `true`, the parser creates a match_phrase query for each multi-position token.').optional(),
  default_operator: z.lazy(() => QueryDslOperator).describe('Default boolean logic used to interpret text in the query string if no operators are specified.').optional(),
  fields: z.array(Field).describe('Array of fields you wish to search. Accepts wildcard expressions. You also can boost relevance scores for matches to particular fields using a caret (`^`) notation. Defaults to the `index.query.default_field index` setting, which has a default value of `*`.').optional(),
  flags: QueryDslSimpleQueryStringFlags.describe('List of enabled operators for the simple query string syntax.').optional(),
  fuzzy_max_expansions: integer.describe('Maximum number of terms to which the query expands for fuzzy matching.').optional(),
  fuzzy_prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`).').optional(),
  lenient: z.boolean().describe('If `true`, format-based errors, such as providing a text value for a numeric field, are ignored.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  query: z.string().describe('Query string in the simple query string syntax you wish to parse and use for search.'),
  quote_field_suffix: z.string().describe('Suffix appended to quoted text in the query string.').optional()
}).meta({ id: 'QueryDslSimpleQueryStringQuery' })
export type QueryDslSimpleQueryStringQuery = z.infer<typeof QueryDslSimpleQueryStringQuery>

export interface QueryDslSpanFieldMaskingQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  field: Field
  query: QueryDslSpanQueryShape
}
export const QueryDslSpanFieldMaskingQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  field: Field,
  get query () { return QueryDslSpanQuery }
}).meta({ id: 'QueryDslSpanFieldMaskingQuery' })
export type QueryDslSpanFieldMaskingQuery = z.infer<typeof QueryDslSpanFieldMaskingQuery>

export interface QueryDslSpanFirstQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  end: integer
  match: QueryDslSpanQueryShape
}
export const QueryDslSpanFirstQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  end: integer.describe('Controls the maximum end position permitted in a match.'),
  get match () { return QueryDslSpanQuery.describe('Can be any other span type query.') }
}).meta({ id: 'QueryDslSpanFirstQuery' })
export type QueryDslSpanFirstQuery = z.infer<typeof QueryDslSpanFirstQuery>

/** Can only be used as a clause in a span_near query. */
export const QueryDslSpanGapQuery = z.record(Field, integer).meta({ id: 'QueryDslSpanGapQuery' })
export type QueryDslSpanGapQuery = z.infer<typeof QueryDslSpanGapQuery>

export interface QueryDslSpanMultiTermQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  match: QueryDslQueryContainerShape
}
export const QueryDslSpanMultiTermQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get match () { return QueryDslQueryContainer.describe('Should be a multi term query (one of `wildcard`, `fuzzy`, `prefix`, `range`, or `regexp` query).') }
}).meta({ id: 'QueryDslSpanMultiTermQuery' })
export type QueryDslSpanMultiTermQuery = z.infer<typeof QueryDslSpanMultiTermQuery>

export interface QueryDslSpanNearQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  clauses: QueryDslSpanQueryShape[]
  in_order?: boolean | undefined
  slop?: integer | undefined
}
export const QueryDslSpanNearQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get clauses () { return QueryDslSpanQuery.array().describe('Array of one or more other span type queries.') },
  in_order: z.boolean().describe('Controls whether matches are required to be in-order.').optional(),
  slop: integer.describe('Controls the maximum number of intervening unmatched positions permitted.').optional()
}).meta({ id: 'QueryDslSpanNearQuery' })
export type QueryDslSpanNearQuery = z.infer<typeof QueryDslSpanNearQuery>

export interface QueryDslSpanNotQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  dist?: integer | undefined
  exclude: QueryDslSpanQueryShape
  include: QueryDslSpanQueryShape
  post?: integer | undefined
  pre?: integer | undefined
}
export const QueryDslSpanNotQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  dist: integer.describe('The number of tokens from within the include span that can’t have overlap with the exclude span. Equivalent to setting both `pre` and `post`.').optional(),
  get exclude () { return QueryDslSpanQuery.describe('Span query whose matches must not overlap those returned.') },
  get include () { return QueryDslSpanQuery.describe('Span query whose matches are filtered.') },
  post: integer.describe('The number of tokens after the include span that can’t have overlap with the exclude span.').optional(),
  pre: integer.describe('The number of tokens before the include span that can’t have overlap with the exclude span.').optional()
}).meta({ id: 'QueryDslSpanNotQuery' })
export type QueryDslSpanNotQuery = z.infer<typeof QueryDslSpanNotQuery>

export interface QueryDslSpanOrQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  clauses: QueryDslSpanQueryShape[]
}
export const QueryDslSpanOrQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get clauses () { return QueryDslSpanQuery.array().describe('Array of one or more other span type queries.') }
}).meta({ id: 'QueryDslSpanOrQuery' })
export type QueryDslSpanOrQuery = z.infer<typeof QueryDslSpanOrQuery>

export const QueryDslSpanTermQuery = z.object({
  ...QueryDslQueryBase.shape,
  value: FieldValue,
  term: FieldValue
}).meta({ id: 'QueryDslSpanTermQuery' })
export type QueryDslSpanTermQuery = z.infer<typeof QueryDslSpanTermQuery>

export interface QueryDslSpanWithinQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  big: QueryDslSpanQueryShape
  little: QueryDslSpanQueryShape
}
export const QueryDslSpanWithinQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get big () { return QueryDslSpanQuery.describe('Can be any span query. Matching spans from `little` that are enclosed within `big` are returned.') },
  get little () { return QueryDslSpanQuery.describe('Can be any span query. Matching spans from `little` that are enclosed within `big` are returned.') }
}).meta({ id: 'QueryDslSpanWithinQuery' })
export type QueryDslSpanWithinQuery = z.infer<typeof QueryDslSpanWithinQuery>

const QueryDslSpanQueryExclusiveProps = z.union([z.object({ span_containing: z.lazy(() => QueryDslSpanContainingQuery) }), z.object({ span_field_masking: z.lazy(() => QueryDslSpanFieldMaskingQuery) }), z.object({ span_first: z.lazy(() => QueryDslSpanFirstQuery) }), z.object({ span_gap: QueryDslSpanGapQuery }), z.object({ span_multi: z.lazy(() => QueryDslSpanMultiTermQuery) }), z.object({ span_near: z.lazy(() => QueryDslSpanNearQuery) }), z.object({ span_not: z.lazy(() => QueryDslSpanNotQuery) }), z.object({ span_or: z.lazy(() => QueryDslSpanOrQuery) }), z.object({ span_term: z.record(Field, QueryDslSpanTermQuery) }), z.object({ span_within: z.lazy(() => QueryDslSpanWithinQuery) })])

export interface QueryDslSpanQueryShape {
  span_containing?: QueryDslSpanContainingQuery | undefined
  span_field_masking?: QueryDslSpanFieldMaskingQuery | undefined
  span_first?: QueryDslSpanFirstQuery | undefined
  span_gap?: QueryDslSpanGapQuery | undefined
  span_multi?: QueryDslSpanMultiTermQuery | undefined
  span_near?: QueryDslSpanNearQuery | undefined
  span_not?: QueryDslSpanNotQuery | undefined
  span_or?: QueryDslSpanOrQuery | undefined
  span_term?: Record<Field, QueryDslSpanTermQuery> | undefined
  span_within?: QueryDslSpanWithinQuery | undefined
}
export const QueryDslSpanQuery: z.ZodType<QueryDslSpanQueryShape> = QueryDslSpanQueryExclusiveProps.meta({ id: 'QueryDslSpanQuery' })
export type QueryDslSpanQuery = z.infer<typeof QueryDslSpanQuery>

export interface QueryDslSpanContainingQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  big: QueryDslSpanQueryShape
  little: QueryDslSpanQueryShape
}
export const QueryDslSpanContainingQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get big () { return QueryDslSpanQuery.describe('Can be any span query. Matching spans from `big` that contain matches from `little` are returned.') },
  get little () { return QueryDslSpanQuery.describe('Can be any span query. Matching spans from `big` that contain matches from `little` are returned.') }
}).meta({ id: 'QueryDslSpanContainingQuery' })
export type QueryDslSpanContainingQuery = z.infer<typeof QueryDslSpanContainingQuery>

const QueryDslSparseVectorQueryCommonProps = z.object({
  field: Field.describe('The name of the field that contains the token-weight pairs to be searched against. This field must be a mapped sparse_vector field.'),
  query: z.string().describe('The query text you want to use for search. If inference_id is specified, query must also be specified.').optional(),
  prune: z.boolean().describe('Whether to perform pruning, omitting the non-significant tokens from the query to improve query performance. If prune is true but the pruning_config is not specified, pruning will occur but default values will be used. Default: false').optional(),
  pruning_config: TokenPruningConfig.describe('Optional pruning configuration. If enabled, this will omit non-significant tokens from the query in order to improve query performance. This is only used if prune is set to true. If prune is set to true but pruning_config is not specified, default values will be used.').optional()
})

const QueryDslSparseVectorQueryExclusiveProps = z.union([z.object({ query_vector: z.record(z.string(), float) }), z.object({ inference_id: Id })])

export const QueryDslSparseVectorQuery = QueryDslSparseVectorQueryCommonProps.and(QueryDslSparseVectorQueryExclusiveProps).meta({ id: 'QueryDslSparseVectorQuery' })
export type QueryDslSparseVectorQuery = z.infer<typeof QueryDslSparseVectorQuery>

export const QueryDslTermQuery = z.object({
  ...QueryDslQueryBase.shape,
  value: FieldValue.describe('Term you wish to find in the provided field.'),
  case_insensitive: z.boolean().describe('Allows ASCII case insensitive matching of the value with the indexed field values when set to `true`. When `false`, the case sensitivity of matching depends on the underlying field’s mapping.').optional()
}).meta({ id: 'QueryDslTermQuery' })
export type QueryDslTermQuery = z.infer<typeof QueryDslTermQuery>

export const QueryDslTermsQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional()
}).catchall(z.any()).meta({ id: 'QueryDslTermsQuery' })
export type QueryDslTermsQuery = z.infer<typeof QueryDslTermsQuery>

export interface QueryDslTermsSetQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  minimum_should_match?: MinimumShouldMatch | undefined
  minimum_should_match_field?: Field | undefined
  minimum_should_match_script?: ScriptShape | undefined
  terms: FieldValue[]
}
export const QueryDslTermsSetQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  minimum_should_match: MinimumShouldMatch.describe('Specification describing number of matching terms required to return a document.').optional(),
  minimum_should_match_field: Field.describe('Numeric field containing the number of matching terms required to return a document.').optional(),
  get minimum_should_match_script () { return Script.describe('Custom script containing the number of matching terms required to return a document.').optional() },
  terms: z.array(FieldValue).describe('Array of terms you wish to find in the provided field.')
}).meta({ id: 'QueryDslTermsSetQuery' })
export type QueryDslTermsSetQuery = z.infer<typeof QueryDslTermsSetQuery>

export const QueryDslTextExpansionQuery = z.object({
  ...QueryDslQueryBase.shape,
  model_id: z.string().describe('The text expansion NLP model to use'),
  model_text: z.string().describe('The query text'),
  pruning_config: TokenPruningConfig.describe('Token pruning configurations').optional()
}).meta({ id: 'QueryDslTextExpansionQuery' })
export type QueryDslTextExpansionQuery = z.infer<typeof QueryDslTextExpansionQuery>

export const QueryDslWeightedTokensQuery = z.object({
  ...QueryDslQueryBase.shape,
  tokens: z.union([z.record(z.string(), float), z.array(z.record(z.string(), float))]).describe('The tokens representing this query'),
  pruning_config: TokenPruningConfig.describe('Token pruning configurations').optional()
}).meta({ id: 'QueryDslWeightedTokensQuery' })
export type QueryDslWeightedTokensQuery = z.infer<typeof QueryDslWeightedTokensQuery>

export const QueryDslWildcardQuery = z.object({
  ...QueryDslQueryBase.shape,
  case_insensitive: z.boolean().describe('Allows case insensitive matching of the pattern with the indexed field values when set to true. Default is false which means the case sensitivity of matching depends on the underlying field’s mapping.').optional(),
  rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  value: z.string().describe('Wildcard pattern for terms you wish to find in the provided field. Required, when wildcard is not set.').optional(),
  wildcard: z.string().describe('Wildcard pattern for terms you wish to find in the provided field. Required, when value is not set.').optional()
}).meta({ id: 'QueryDslWildcardQuery' })
export type QueryDslWildcardQuery = z.infer<typeof QueryDslWildcardQuery>

export const QueryDslWrapperQuery = z.object({
  ...QueryDslQueryBase.shape,
  query: z.string().describe('A base64 encoded query. The binary data format can be any of JSON, YAML, CBOR or SMILE encodings')
}).meta({ id: 'QueryDslWrapperQuery' })
export type QueryDslWrapperQuery = z.infer<typeof QueryDslWrapperQuery>

export const QueryDslTypeQuery = z.object({
  ...QueryDslQueryBase.shape,
  value: z.string()
}).meta({ id: 'QueryDslTypeQuery' })
export type QueryDslTypeQuery = z.infer<typeof QueryDslTypeQuery>

const QueryDslQueryContainerExclusiveProps = z.union([z.object({ bool: z.lazy(() => QueryDslBoolQuery) }), z.object({ boosting: z.lazy(() => QueryDslBoostingQuery) }), z.object({ common: z.record(Field, QueryDslCommonTermsQuery) }), z.object({ combined_fields: QueryDslCombinedFieldsQuery }), z.object({ constant_score: z.lazy(() => QueryDslConstantScoreQuery) }), z.object({ dis_max: z.lazy(() => QueryDslDisMaxQuery) }), z.object({ distance_feature: QueryDslDistanceFeatureQuery }), z.object({ exists: QueryDslExistsQuery }), z.object({ function_score: z.lazy(() => QueryDslFunctionScoreQuery) }), z.object({ fuzzy: z.record(Field, QueryDslFuzzyQuery) }), z.object({ geo_bounding_box: QueryDslGeoBoundingBoxQuery }), z.object({ geo_distance: QueryDslGeoDistanceQuery }), z.object({ geo_grid: z.record(Field, QueryDslGeoGridQuery) }), z.object({ geo_polygon: QueryDslGeoPolygonQuery }), z.object({ geo_shape: QueryDslGeoShapeQuery }), z.object({ has_child: z.lazy(() => QueryDslHasChildQuery) }), z.object({ has_parent: z.lazy(() => QueryDslHasParentQuery) }), z.object({ ids: QueryDslIdsQuery }), z.object({ intervals: z.record(Field, z.lazy(() => QueryDslIntervalsQuery)) }), z.object({ knn: z.lazy(() => KnnQuery) }), z.object({ match: z.record(Field, QueryDslMatchQuery) }), z.object({ match_all: QueryDslMatchAllQuery }), z.object({ match_bool_prefix: z.record(Field, QueryDslMatchBoolPrefixQuery) }), z.object({ match_none: QueryDslMatchNoneQuery }), z.object({ match_phrase: z.record(Field, QueryDslMatchPhraseQuery) }), z.object({ match_phrase_prefix: z.record(Field, QueryDslMatchPhrasePrefixQuery) }), z.object({ more_like_this: QueryDslMoreLikeThisQuery }), z.object({ multi_match: QueryDslMultiMatchQuery }), z.object({ nested: z.lazy(() => QueryDslNestedQuery) }), z.object({ parent_id: QueryDslParentIdQuery }), z.object({ percolate: QueryDslPercolateQuery }), z.object({ pinned: z.lazy(() => QueryDslPinnedQuery) }), z.object({ prefix: z.record(Field, QueryDslPrefixQuery) }), z.object({ query_string: QueryDslQueryStringQuery }), z.object({ range: z.record(Field, QueryDslRangeQuery) }), z.object({ rank_feature: QueryDslRankFeatureQuery }), z.object({ regexp: z.record(Field, QueryDslRegexpQuery) }), z.object({ rule: z.lazy(() => QueryDslRuleQuery) }), z.object({ script: z.lazy(() => QueryDslScriptQuery) }), z.object({ script_score: z.lazy(() => QueryDslScriptScoreQuery) }), z.object({ semantic: QueryDslSemanticQuery }), z.object({ shape: QueryDslShapeQuery }), z.object({ simple_query_string: QueryDslSimpleQueryStringQuery }), z.object({ span_containing: z.lazy(() => QueryDslSpanContainingQuery) }), z.object({ span_field_masking: z.lazy(() => QueryDslSpanFieldMaskingQuery) }), z.object({ span_first: z.lazy(() => QueryDslSpanFirstQuery) }), z.object({ span_multi: z.lazy(() => QueryDslSpanMultiTermQuery) }), z.object({ span_near: z.lazy(() => QueryDslSpanNearQuery) }), z.object({ span_not: z.lazy(() => QueryDslSpanNotQuery) }), z.object({ span_or: z.lazy(() => QueryDslSpanOrQuery) }), z.object({ span_term: z.record(Field, QueryDslSpanTermQuery) }), z.object({ span_within: z.lazy(() => QueryDslSpanWithinQuery) }), z.object({ sparse_vector: QueryDslSparseVectorQuery }), z.object({ term: z.record(Field, QueryDslTermQuery) }), z.object({ terms: QueryDslTermsQuery }), z.object({ terms_set: z.record(Field, z.lazy(() => QueryDslTermsSetQuery)) }), z.object({ text_expansion: z.record(Field, QueryDslTextExpansionQuery) }), z.object({ weighted_tokens: z.record(Field, QueryDslWeightedTokensQuery) }), z.object({ wildcard: z.record(Field, QueryDslWildcardQuery) }), z.object({ wrapper: QueryDslWrapperQuery }), z.object({ type: QueryDslTypeQuery })])

export interface QueryDslQueryContainerShape {
  bool?: QueryDslBoolQuery | undefined
  boosting?: QueryDslBoostingQuery | undefined
  common?: Record<Field, QueryDslCommonTermsQuery> | undefined
  combined_fields?: QueryDslCombinedFieldsQuery | undefined
  constant_score?: QueryDslConstantScoreQuery | undefined
  dis_max?: QueryDslDisMaxQuery | undefined
  distance_feature?: QueryDslDistanceFeatureQuery | undefined
  exists?: QueryDslExistsQuery | undefined
  function_score?: QueryDslFunctionScoreQuery | undefined
  fuzzy?: Record<Field, QueryDslFuzzyQuery> | undefined
  geo_bounding_box?: QueryDslGeoBoundingBoxQuery | undefined
  geo_distance?: QueryDslGeoDistanceQuery | undefined
  geo_grid?: Record<Field, QueryDslGeoGridQuery> | undefined
  geo_polygon?: QueryDslGeoPolygonQuery | undefined
  geo_shape?: QueryDslGeoShapeQuery | undefined
  has_child?: QueryDslHasChildQuery | undefined
  has_parent?: QueryDslHasParentQuery | undefined
  ids?: QueryDslIdsQuery | undefined
  intervals?: Record<Field, QueryDslIntervalsQuery> | undefined
  knn?: KnnQuery | undefined
  match?: Record<Field, QueryDslMatchQuery> | undefined
  match_all?: QueryDslMatchAllQuery | undefined
  match_bool_prefix?: Record<Field, QueryDslMatchBoolPrefixQuery> | undefined
  match_none?: QueryDslMatchNoneQuery | undefined
  match_phrase?: Record<Field, QueryDslMatchPhraseQuery> | undefined
  match_phrase_prefix?: Record<Field, QueryDslMatchPhrasePrefixQuery> | undefined
  more_like_this?: QueryDslMoreLikeThisQuery | undefined
  multi_match?: QueryDslMultiMatchQuery | undefined
  nested?: QueryDslNestedQuery | undefined
  parent_id?: QueryDslParentIdQuery | undefined
  percolate?: QueryDslPercolateQuery | undefined
  pinned?: QueryDslPinnedQuery | undefined
  prefix?: Record<Field, QueryDslPrefixQuery> | undefined
  query_string?: QueryDslQueryStringQuery | undefined
  range?: Record<Field, QueryDslRangeQuery> | undefined
  rank_feature?: QueryDslRankFeatureQuery | undefined
  regexp?: Record<Field, QueryDslRegexpQuery> | undefined
  rule?: QueryDslRuleQuery | undefined
  script?: QueryDslScriptQuery | undefined
  script_score?: QueryDslScriptScoreQuery | undefined
  semantic?: QueryDslSemanticQuery | undefined
  shape?: QueryDslShapeQuery | undefined
  simple_query_string?: QueryDslSimpleQueryStringQuery | undefined
  span_containing?: QueryDslSpanContainingQuery | undefined
  span_field_masking?: QueryDslSpanFieldMaskingQuery | undefined
  span_first?: QueryDslSpanFirstQuery | undefined
  span_multi?: QueryDslSpanMultiTermQuery | undefined
  span_near?: QueryDslSpanNearQuery | undefined
  span_not?: QueryDslSpanNotQuery | undefined
  span_or?: QueryDslSpanOrQuery | undefined
  span_term?: Record<Field, QueryDslSpanTermQuery> | undefined
  span_within?: QueryDslSpanWithinQuery | undefined
  sparse_vector?: QueryDslSparseVectorQuery | undefined
  term?: Record<Field, QueryDslTermQuery> | undefined
  terms?: QueryDslTermsQuery | undefined
  terms_set?: Record<Field, QueryDslTermsSetQuery> | undefined
  text_expansion?: Record<Field, QueryDslTextExpansionQuery> | undefined
  weighted_tokens?: Record<Field, QueryDslWeightedTokensQuery> | undefined
  wildcard?: Record<Field, QueryDslWildcardQuery> | undefined
  wrapper?: QueryDslWrapperQuery | undefined
  type?: QueryDslTypeQuery | undefined
}
/** An Elasticsearch Query DSL (Domain Specific Language) object that defines a query. */
export const QueryDslQueryContainer: z.ZodType<QueryDslQueryContainerShape> = QueryDslQueryContainerExclusiveProps.meta({ id: 'QueryDslQueryContainer' })
export type QueryDslQueryContainer = z.infer<typeof QueryDslQueryContainer>

export interface KnnSearchShape {
  field: Field
  query_vector?: QueryVector | undefined
  query_vector_builder?: QueryVectorBuilder | undefined
  k?: integer | undefined
  num_candidates?: integer | undefined
  visit_percentage?: float | undefined
  boost?: float | undefined
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  similarity?: float | undefined
  inner_hits?: SearchInnerHitsShape | undefined
  rescore_vector?: RescoreVector | undefined
  query_name?: string | undefined
}
export const KnnSearch = z.object({
  field: Field.describe('The name of the vector field to search against'),
  query_vector: QueryVector.describe('The query vector').optional(),
  query_vector_builder: QueryVectorBuilder.describe('The query vector builder. You must provide a query_vector_builder or query_vector, but not both.').optional(),
  k: integer.describe('The final number of nearest neighbors to return as top hits').optional(),
  num_candidates: integer.describe('The number of nearest neighbor candidates to consider per shard').optional(),
  visit_percentage: float.describe('The percentage of vectors to explore per shard while doing knn search with bbq_disk').optional(),
  boost: float.describe('Boost value to apply to kNN scores').optional(),
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Filters for the kNN search query').optional() },
  similarity: float.describe('The minimum similarity for a vector to be considered a match').optional(),
  get inner_hits () { return SearchInnerHits.describe('If defined, each search hit will contain inner hits.').optional() },
  rescore_vector: RescoreVector.describe('Apply oversampling and rescoring to quantized vectors').optional(),
  query_name: z.string().optional()
}).meta({ id: 'KnnSearch' })
export type KnnSearch = z.infer<typeof KnnSearch>

export interface RetrieverBaseShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
}
export const RetrieverBase = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional()
}).meta({ id: 'RetrieverBase' })
export type RetrieverBase = z.infer<typeof RetrieverBase>

export interface StandardRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  query?: QueryDslQueryContainerShape | undefined
  search_after?: SortResults | undefined
  terminate_after?: integer | undefined
  sort?: SortShape | undefined
  collapse?: SearchFieldCollapseShape | undefined
}
export const StandardRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get query () { return QueryDslQueryContainer.describe('Defines a query to retrieve a set of top documents.').optional() },
  search_after: SortResults.describe('Defines a search after object parameter used for pagination.').optional(),
  terminate_after: integer.describe('Maximum number of documents to collect for each shard.').optional(),
  get sort () { return Sort.describe('A sort object that that specifies the order of matching documents.').optional() },
  get collapse () { return SearchFieldCollapse.describe('Collapses the top documents by a specified key into a single top document per key.').optional() }
}).meta({ id: 'StandardRetriever' })
export type StandardRetriever = z.infer<typeof StandardRetriever>

export interface KnnRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  field: string
  query_vector?: QueryVector | undefined
  query_vector_builder?: QueryVectorBuilder | undefined
  k: integer
  num_candidates: integer
  visit_percentage?: float | undefined
  similarity?: float | undefined
  rescore_vector?: RescoreVector | undefined
}
export const KnnRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  field: z.string().describe('The name of the vector field to search against.'),
  query_vector: QueryVector.describe('Query vector. Must have the same number of dimensions as the vector field you are searching against. You must provide a query_vector_builder or query_vector, but not both.').optional(),
  query_vector_builder: QueryVectorBuilder.describe('Defines a model to build a query vector.').optional(),
  k: integer.describe('Number of nearest neighbors to return as top hits.'),
  num_candidates: integer.describe('Number of nearest neighbor candidates to consider per shard.'),
  visit_percentage: float.describe('The percentage of vectors to explore per shard while doing knn search with bbq_disk').optional(),
  similarity: float.describe('The minimum similarity required for a document to be considered a match.').optional(),
  rescore_vector: RescoreVector.describe('Apply oversampling and rescoring to quantized vectors').optional()
}).meta({ id: 'KnnRetriever' })
export type KnnRetriever = z.infer<typeof KnnRetriever>

export interface RRFRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retrievers: RRFRetrieverEntryShape[]
  rank_constant?: integer | undefined
  rank_window_size?: integer | undefined
  query?: string | undefined
  fields?: string[] | undefined
}
export const RRFRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retrievers () { return RRFRetrieverEntry.array().describe('A list of child retrievers to specify which sets of returned top documents will have the RRF formula applied to them. Each retriever can optionally include a weight parameter.') },
  rank_constant: integer.describe('This value determines how much influence documents in individual result sets per query have over the final ranked result set.').optional(),
  rank_window_size: integer.describe('This value determines the size of the individual result sets per query.').optional(),
  query: z.string().optional(),
  fields: z.array(z.string()).optional()
}).meta({ id: 'RRFRetriever' })
export type RRFRetriever = z.infer<typeof RRFRetriever>

export interface TextSimilarityRerankerShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retriever: RetrieverContainerShape
  rank_window_size?: integer | undefined
  inference_id?: string | undefined
  inference_text: string
  field: string
  chunk_rescorer?: ChunkRescorer | undefined
}
export const TextSimilarityReranker = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retriever () { return RetrieverContainer.describe('The nested retriever which will produce the first-level results, that will later be used for reranking.') },
  rank_window_size: integer.describe('This value determines how many documents we will consider from the nested retriever.').optional(),
  inference_id: z.string().describe('Unique identifier of the inference endpoint created using the inference API.').optional(),
  inference_text: z.string().describe('The text snippet used as the basis for similarity comparison.'),
  field: z.string().describe('The document field to be used for text similarity comparisons. This field should contain the text that will be evaluated against the inference_text.'),
  chunk_rescorer: z.lazy(() => ChunkRescorer).describe('Whether to rescore on only the best matching chunks.').optional()
}).meta({ id: 'TextSimilarityReranker' })
export type TextSimilarityReranker = z.infer<typeof TextSimilarityReranker>

export interface RuleRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  ruleset_ids: Id | Id[]
  match_criteria: unknown
  retriever: RetrieverContainerShape
  rank_window_size?: integer | undefined
}
export const RuleRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  ruleset_ids: z.union([Id, z.array(Id)]).describe('The ruleset IDs containing the rules this retriever is evaluating against.'),
  match_criteria: z.any().describe('The match criteria that will determine if a rule in the provided rulesets should be applied.'),
  get retriever () { return RetrieverContainer.describe('The retriever whose results rules should be applied to.') },
  rank_window_size: integer.describe('This value determines the size of the individual result set.').optional()
}).meta({ id: 'RuleRetriever' })
export type RuleRetriever = z.infer<typeof RuleRetriever>

export interface LinearRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retrievers?: InnerRetrieverShape[] | undefined
  rank_window_size?: integer | undefined
  query?: string | undefined
  fields?: string[] | undefined
  normalizer?: ScoreNormalizer | undefined
}
export const LinearRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retrievers () { return InnerRetriever.array().describe('Inner retrievers.').optional() },
  rank_window_size: integer.optional(),
  query: z.string().optional(),
  fields: z.array(z.string()).optional(),
  normalizer: ScoreNormalizer.optional()
}).meta({ id: 'LinearRetriever' })
export type LinearRetriever = z.infer<typeof LinearRetriever>

export interface PinnedRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retriever: RetrieverContainerShape
  ids?: string[] | undefined
  docs?: SpecifiedDocument[] | undefined
  rank_window_size?: integer | undefined
}
export const PinnedRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retriever () { return RetrieverContainer.describe('Inner retriever.') },
  ids: z.array(z.string()).optional(),
  docs: z.array(SpecifiedDocument).optional(),
  rank_window_size: integer.optional()
}).meta({ id: 'PinnedRetriever' })
export type PinnedRetriever = z.infer<typeof PinnedRetriever>

export interface DiversifyRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  type: DiversifyRetrieverTypes
  field: string
  retriever: RetrieverContainerShape
  size?: integer | undefined
  rank_window_size?: integer | undefined
  query_vector?: QueryVector | undefined
  query_vector_builder?: QueryVectorBuilder | undefined
  lambda?: float | undefined
}
export const DiversifyRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  type: DiversifyRetrieverTypes.describe('The diversification strategy to apply.'),
  field: z.string().describe('The document field on which to diversify results on.'),
  get retriever () { return RetrieverContainer.describe('The nested retriever whose results will be diversified.') },
  size: integer.describe('The number of top documents to return after diversification.').optional(),
  rank_window_size: integer.describe('The number of top documents from the nested retriever to consider for diversification.').optional(),
  query_vector: QueryVector.describe('The query vector used for diversification.').optional(),
  query_vector_builder: QueryVectorBuilder.describe('a dense vector query vector builder to use instead of a static query_vector').optional(),
  lambda: float.describe('Controls the trade-off between relevance and diversity for MMR. A value of 0.0 focuses solely on diversity, while a value of 1.0 focuses solely on relevance. Required for MMR').optional()
}).meta({ id: 'DiversifyRetriever' })
export type DiversifyRetriever = z.infer<typeof DiversifyRetriever>

export const QueryDslDecayPlacement = z.object({
  decay: double.describe('Defines how documents are scored at the distance given at scale.').optional(),
  offset: z.any().describe('If defined, the decay function will only compute the decay function for documents with a distance greater than the defined `offset`.').optional(),
  scale: z.any().describe('Defines the distance from origin + offset at which the computed score will equal `decay` parameter.').optional(),
  origin: z.any().describe('The point of origin used for calculating distance. Must be given as a number for numeric field, date for date fields and geo point for geo fields.').optional()
}).meta({ id: 'QueryDslDecayPlacement' })
export type QueryDslDecayPlacement = z.infer<typeof QueryDslDecayPlacement>

export const QueryDslFieldLookup = z.object({
  id: Id.describe('`id` of the document.'),
  index: IndexName.describe('Index from which to retrieve the document.').optional(),
  path: Field.describe('Name of the field.').optional(),
  routing: z.string().describe('Custom routing value.').optional()
}).meta({ id: 'QueryDslFieldLookup' })
export type QueryDslFieldLookup = z.infer<typeof QueryDslFieldLookup>

export const QueryDslGeoPolygonPoints = z.object({
  points: z.array(GeoLocation)
}).meta({ id: 'QueryDslGeoPolygonPoints' })
export type QueryDslGeoPolygonPoints = z.infer<typeof QueryDslGeoPolygonPoints>

export const QueryDslGeoShapeFieldQuery = z.object({
  shape: GeoShape.optional(),
  indexed_shape: QueryDslFieldLookup.describe('Query using an indexed shape retrieved from the the specified document and path.').optional(),
  relation: GeoShapeRelation.describe('Spatial relation operator used to search a geo field.').optional()
}).meta({ id: 'QueryDslGeoShapeFieldQuery' })
export type QueryDslGeoShapeFieldQuery = z.infer<typeof QueryDslGeoShapeFieldQuery>

export const QueryDslShapeFieldQuery = z.object({
  indexed_shape: QueryDslFieldLookup.describe('Queries using a pre-indexed shape.').optional(),
  relation: GeoShapeRelation.describe('Spatial relation between the query shape and the document shape.').optional(),
  shape: GeoShape.describe('Queries using an inline shape definition in GeoJSON or Well Known Text (WKT) format.').optional()
}).meta({ id: 'QueryDslShapeFieldQuery' })
export type QueryDslShapeFieldQuery = z.infer<typeof QueryDslShapeFieldQuery>

export const QueryDslSimpleQueryStringFlag = z.enum(['NONE', 'AND', 'NOT', 'OR', 'PREFIX', 'PHRASE', 'PRECEDENCE', 'ESCAPE', 'WHITESPACE', 'FUZZY', 'NEAR', 'SLOP', 'ALL']).meta({ id: 'QueryDslSimpleQueryStringFlag' })
export type QueryDslSimpleQueryStringFlag = z.infer<typeof QueryDslSimpleQueryStringFlag>

export const QueryDslTermsLookup = z.object({
  index: IndexName,
  id: Id,
  path: Field,
  routing: z.string().optional()
}).meta({ id: 'QueryDslTermsLookup' })
export type QueryDslTermsLookup = z.infer<typeof QueryDslTermsLookup>

export const QueryDslTermsQueryField = z.union([z.array(FieldValue), QueryDslTermsLookup]).meta({ id: 'QueryDslTermsQueryField' })
export type QueryDslTermsQueryField = z.infer<typeof QueryDslTermsQueryField>
