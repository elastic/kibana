/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchTrackHits } from './_global.search'
import { Field, Fields, Indices, MapboxVectorTiles, RequestBase, integer } from './_types'
import { AggregationsAggregationContainer } from './_types.aggregations'
import { MappingRuntimeFields } from './_types.mapping'
import { QueryDslQueryContainer, Sort } from './_types.query_dsl'

export const SearchMvtZoomLevel = integer.meta({ id: 'SearchMvtZoomLevel' })
export type SearchMvtZoomLevel = z.infer<typeof SearchMvtZoomLevel>

export const SearchMvtCoordinate = integer.meta({ id: 'SearchMvtCoordinate' })
export type SearchMvtCoordinate = z.infer<typeof SearchMvtCoordinate>

export const SearchMvtGridAggregationType = z.enum(['geotile', 'geohex']).meta({ id: 'SearchMvtGridAggregationType' })
export type SearchMvtGridAggregationType = z.infer<typeof SearchMvtGridAggregationType>

export const SearchMvtGridType = z.enum(['grid', 'point', 'centroid']).meta({ id: 'SearchMvtGridType' })
export type SearchMvtGridType = z.infer<typeof SearchMvtGridType>

/**
 * Search a vector tile.
 *
 * Search a vector tile for geospatial values.
 * Before using this API, you should be familiar with the Mapbox vector tile specification.
 * The API returns results as a binary mapbox vector tile.
 *
 * Internally, Elasticsearch translates a vector tile search API request into a search containing:
 *
 * * A `geo_bounding_box` query on the `<field>`. The query uses the `<zoom>/<x>/<y>` tile as a bounding box.
 * * A `geotile_grid` or `geohex_grid` aggregation on the `<field>`. The `grid_agg` parameter determines the aggregation type. The aggregation uses the `<zoom>/<x>/<y>` tile as a bounding box.
 * * Optionally, a `geo_bounds` aggregation on the `<field>`. The search only includes this aggregation if the `exact_bounds` parameter is `true`.
 * * If the optional parameter `with_labels` is `true`, the internal search will include a dynamic runtime field that calls the `getLabelPosition` function of the geometry doc value. This enables the generation of new point features containing suggested geometry labels, so that, for example, multi-polygons will have only one label.
 *
 * The API returns results as a binary Mapbox vector tile.
 * Mapbox vector tiles are encoded as Google Protobufs (PBF). By default, the tile contains three layers:
 *
 * * A `hits` layer containing a feature for each `<field>` value matching the `geo_bounding_box` query.
 * * An `aggs` layer containing a feature for each cell of the `geotile_grid` or `geohex_grid`. The layer only contains features for cells with matching data.
 * * A meta layer containing:
 *   * A feature containing a bounding box. By default, this is the bounding box of the tile.
 *   * Value ranges for any sub-aggregations on the `geotile_grid` or `geohex_grid`.
 *   * Metadata for the search.
 *
 * The API only returns features that can display at its zoom level.
 * For example, if a polygon feature has no area at its zoom level, the API omits it.
 * The API returns errors as UTF-8 encoded JSON.
 *
 * IMPORTANT: You can specify several options for this API as either a query parameter or request body parameter.
 * If you specify both parameters, the query parameter takes precedence.
 *
 * **Grid precision for geotile**
 *
 * For a `grid_agg` of `geotile`, you can use cells in the `aggs` layer as tiles for lower zoom levels.
 * `grid_precision` represents the additional zoom levels available through these cells. The final precision is computed by as follows: `<zoom> + grid_precision`.
 * For example, if `<zoom>` is 7 and `grid_precision` is 8, then the `geotile_grid` aggregation will use a precision of 15.
 * The maximum final precision is 29.
 * The `grid_precision` also determines the number of cells for the grid as follows: `(2^grid_precision) x (2^grid_precision)`.
 * For example, a value of 8 divides the tile into a grid of 256 x 256 cells.
 * The `aggs` layer only contains features for cells with matching data.
 *
 * **Grid precision for geohex**
 *
 * For a `grid_agg` of `geohex`, Elasticsearch uses `<zoom>` and `grid_precision` to calculate a final precision as follows: `<zoom> + grid_precision`.
 *
 * This precision determines the H3 resolution of the hexagonal cells produced by the `geohex` aggregation.
 * The following table maps the H3 resolution for each precision.
 * For example, if `<zoom>` is 3 and `grid_precision` is 3, the precision is 6.
 * At a precision of 6, hexagonal cells have an H3 resolution of 2.
 * If `<zoom>` is 3 and `grid_precision` is 4, the precision is 7.
 * At a precision of 7, hexagonal cells have an H3 resolution of 3.
 *
 * | Precision | Unique tile bins | H3 resolution | Unique hex bins | Ratio |
 * | --------- | ---------------- | ------------- | ----------------| ----- |
 * | 1  | 4                  | 0  | 122             | 30.5           |
 * | 2  | 16                 | 0  | 122             | 7.625          |
 * | 3  | 64                 | 1  | 842             | 13.15625       |
 * | 4  | 256                | 1  | 842             | 3.2890625      |
 * | 5  | 1024               | 2  | 5882            | 5.744140625    |
 * | 6  | 4096               | 2  | 5882            | 1.436035156    |
 * | 7  | 16384              | 3  | 41162           | 2.512329102    |
 * | 8  | 65536              | 3  | 41162           | 0.6280822754   |
 * | 9  | 262144             | 4  | 288122          | 1.099098206    |
 * | 10 | 1048576            | 4  | 288122          | 0.2747745514   |
 * | 11 | 4194304            | 5  | 2016842         | 0.4808526039   |
 * | 12 | 16777216           | 6  | 14117882        | 0.8414913416   |
 * | 13 | 67108864           | 6  | 14117882        | 0.2103728354   |
 * | 14 | 268435456          | 7  | 98825162        | 0.3681524172   |
 * | 15 | 1073741824         | 8  | 691776122       | 0.644266719    |
 * | 16 | 4294967296         | 8  | 691776122       | 0.1610666797   |
 * | 17 | 17179869184        | 9  | 4842432842      | 0.2818666889   |
 * | 18 | 68719476736        | 10 | 33897029882     | 0.4932667053   |
 * | 19 | 274877906944       | 11 | 237279209162    | 0.8632167343   |
 * | 20 | 1099511627776      | 11 | 237279209162    | 0.2158041836   |
 * | 21 | 4398046511104      | 12 | 1660954464122   | 0.3776573213   |
 * | 22 | 17592186044416     | 13 | 11626681248842  | 0.6609003122   |
 * | 23 | 70368744177664     | 13 | 11626681248842  | 0.165225078    |
 * | 24 | 281474976710656    | 14 | 81386768741882  | 0.2891438866   |
 * | 25 | 1125899906842620   | 15 | 569707381193162 | 0.5060018015   |
 * | 26 | 4503599627370500   | 15 | 569707381193162 | 0.1265004504   |
 * | 27 | 18014398509482000  | 15 | 569707381193162 | 0.03162511259  |
 * | 28 | 72057594037927900  | 15 | 569707381193162 | 0.007906278149 |
 * | 29 | 288230376151712000 | 15 | 569707381193162 | 0.001976569537 |
 *
 * Hexagonal cells don't align perfectly on a vector tile.
 * Some cells may intersect more than one vector tile.
 * To compute the H3 resolution for each precision, Elasticsearch compares the average density of hexagonal bins at each resolution with the average density of tile bins at each zoom level.
 * Elasticsearch uses the H3 resolution that is closest to the corresponding geotile density.
 *
 * Learn how to use the vector tile search API with practical examples in the [Vector tile search examples](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/vector-tile-search) guide.
 */
export const SearchMvtRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A list of indices, data streams, or aliases to search. It supports wildcards (`*`). To search all data streams and indices, omit this parameter or use `*` or `_all`. To search a remote cluster, use the `<cluster>:<target>` syntax.').meta({ found_in: 'path' }),
  field: Field.describe('A field that contains the geospatial data to return. It must be a `geo_point` or `geo_shape` field. The field must have doc values enabled. It cannot be a nested field. NOTE: Vector tiles do not natively support geometry collections. For `geometrycollection` values in a `geo_shape` field, the API returns a hits layer feature for each element of the collection. This behavior may change in a future release.').meta({ found_in: 'path' }),
  zoom: SearchMvtZoomLevel.describe('The zoom level of the vector tile to search. It accepts `0` to `29`.').meta({ found_in: 'path' }),
  x: SearchMvtCoordinate.describe('The X coordinate for the vector tile to search.').meta({ found_in: 'path' }),
  y: SearchMvtCoordinate.describe('The Y coordinate for the vector tile to search.').meta({ found_in: 'path' }),
  aggs: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('Sub-aggregations for the geotile_grid. It supports the following aggregation types: - `avg` - `boxplot` - `cardinality` - `extended stats` - `max` - `median absolute deviation` - `min` - `percentile` - `percentile-rank` - `stats` - `sum` - `value count` The aggregation names can\'t start with `_mvt_`. The `_mvt_` prefix is reserved for internal aggregations.').optional().meta({ found_in: 'body' }),
  buffer: integer.describe('The size, in pixels, of a clipping buffer outside the tile. This allows renderers to avoid outline artifacts from geometries that extend past the extent of the tile.').optional().meta({ found_in: 'body' }),
  exact_bounds: z.boolean().describe('If `false`, the meta layer\'s feature is the bounding box of the tile. If `true`, the meta layer\'s feature is a bounding box resulting from a `geo_bounds` aggregation. The aggregation runs on <field> values that intersect the `<zoom>/<x>/<y>` tile with `wrap_longitude` set to `false`. The resulting bounding box may be larger than the vector tile.').optional().meta({ found_in: 'body' }),
  extent: integer.describe('The size, in pixels, of a side of the tile. Vector tiles are square with equal sides.').optional().meta({ found_in: 'body' }),
  fields: Fields.describe('The fields to return in the `hits` layer. It supports wildcards (`*`). This parameter does not support fields with array values. Fields with array values may return inconsistent results.').optional().meta({ found_in: 'body' }),
  grid_agg: SearchMvtGridAggregationType.describe('The aggregation used to create a grid for the `field`.').optional().meta({ found_in: 'body' }),
  grid_precision: integer.describe('Additional zoom levels available through the aggs layer. For example, if `<zoom>` is `7` and `grid_precision` is `8`, you can zoom in up to level 15. Accepts 0-8. If 0, results don\'t include the aggs layer.').optional().meta({ found_in: 'body' }),
  grid_type: SearchMvtGridType.describe('Determines the geometry type for features in the aggs layer. In the aggs layer, each feature represents a `geotile_grid` cell. If `grid, each feature is a polygon of the cells bounding box. If `point`, each feature is a Point that is the centroid of the cell.').optional().meta({ found_in: 'body' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('The query DSL used to filter documents for the search.').optional().meta({ found_in: 'body' }),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('Defines one or more runtime fields in the search request. These fields take precedence over mapped fields with the same name.').optional().meta({ found_in: 'body' }),
  size: integer.describe('The maximum number of features to return in the hits layer. Accepts 0-10000. If 0, results don\'t include the hits layer.').optional().meta({ found_in: 'body' }),
  sort: z.lazy(() => Sort).describe('Sort the features in the hits layer. By default, the API calculates a bounding box for each feature. It sorts features based on this box\'s diagonal length, from longest to shortest.').optional().meta({ found_in: 'body' }),
  track_total_hits: SearchTrackHits.describe('The number of hits matching the query to count accurately. If `true`, the exact number of hits is returned at the cost of some performance. If `false`, the response does not include the total number of hits matching the query.').optional().meta({ found_in: 'body' }),
  with_labels: z.boolean().describe('If `true`, the hits and aggs layers will contain additional point features representing suggested label positions for the original features. * `Point` and `MultiPoint` features will have one of the points selected. * `Polygon` and `MultiPolygon` features will have a single point generated, either the centroid, if it is within the polygon, or another point within the polygon selected from the sorted triangle-tree. * `LineString` features will likewise provide a roughly central point selected from the triangle-tree. * The aggregation results will provide one central point for each aggregation bucket. All attributes from the original features will also be copied to the new label features. In addition, the new features will be distinguishable using the tag `_mvt_label_position`.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchMvtRequest' })
export type SearchMvtRequest = z.infer<typeof SearchMvtRequest>

export const SearchMvtResponse = MapboxVectorTiles.meta({ id: 'SearchMvtResponse' })
export type SearchMvtResponse = z.infer<typeof SearchMvtResponse>
