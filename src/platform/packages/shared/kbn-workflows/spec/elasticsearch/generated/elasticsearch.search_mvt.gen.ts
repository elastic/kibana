/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Generated at: 2025-11-27T07:04:28.246Z
 * Source: elasticsearch-specification repository, operations: search-mvt, search-mvt-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_mvt1_request,
  search_mvt1_response,
  search_mvt_request,
  search_mvt_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_MVT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_mvt',
  connectorGroup: 'internal',
  summary: `Search a vector tile`,
  description: `Search a vector tile.

Search a vector tile for geospatial values.
Before using this API, you should be familiar with the Mapbox vector tile specification.
The API returns results as a binary mapbox vector tile.

Internally, Elasticsearch translates a vector tile search API request into a search containing:

* A \`geo_bounding_box\` query on the \`<field>\`. The query uses the \`<zoom>/<x>/<y>\` tile as a bounding box.
* A \`geotile_grid\` or \`geohex_grid\` aggregation on the \`<field>\`. The \`grid_agg\` parameter determines the aggregation type. The aggregation uses the \`<zoom>/<x>/<y>\` tile as a bounding box.
* Optionally, a \`geo_bounds\` aggregation on the \`<field>\`. The search only includes this aggregation if the \`exact_bounds\` parameter is \`true\`.
* If the optional parameter \`with_labels\` is \`true\`, the internal search will include a dynamic runtime field that calls the \`getLabelPosition\` function of the geometry doc value. This enables the generation of new point features containing suggested geometry labels, so that, for example, multi-polygons will have only one label.

The API returns results as a binary Mapbox vector tile.
Mapbox vector tiles are encoded as Google Protobufs (PBF). By default, the tile contains three layers:

* A \`hits\` layer containing a feature for each \`<field>\` value matching the \`geo_bounding_box\` query.
* An \`aggs\` layer containing a feature for each cell of the \`geotile_grid\` or \`geohex_grid\`. The layer only contains features for cells with matching data.
* A meta layer containing:
  * A feature containing a bounding box. By default, this is the bounding box of the tile.
  * Value ranges for any sub-aggregations on the \`geotile_grid\` or \`geohex_grid\`.
  * Metadata for the search.

The API only returns features that can display at its zoom level.
For example, if a polygon feature has no area at its zoom level, the API omits it.
The API returns errors as UTF-8 encoded JSON.

IMPORTANT: You can specify several options for this API as either a query parameter or request body parameter.
If you specify both parameters, the query parameter takes precedence.

**Grid precision for geotile**

For a \`grid_agg\` of \`geotile\`, you can use cells in the \`aggs\` layer as tiles for lower zoom levels.
\`grid_precision\` represents the additional zoom levels available through these cells. The final precision is computed by as follows: \`<zoom> + grid_precision\`.
For example, if \`<zoom>\` is 7 and \`grid_precision\` is 8, then the \`geotile_grid\` aggregation will use a precision of 15.
The maximum final precision is 29.
The \`grid_precision\` also determines the number of cells for the grid as follows: \`(2^grid_precision) x (2^grid_precision)\`.
For example, a value of 8 divides the tile into a grid of 256 x 256 cells.
The \`aggs\` layer only contains features for cells with matching data.

**Grid precision for geohex**

For a \`grid_agg\` of \`geohex\`, Elasticsearch uses \`<zoom>\` and \`grid_precision\` to calculate a final precision as follows: \`<zoom> + grid_precision\`.

This precision determines the H3 resolution of the hexagonal cells produced by the \`geohex\` aggregation.
The following table maps the H3 resolution for each precision.
For example, if \`<zoom>\` is 3 and \`grid_precision\` is 3, the precision is 6.
At a precision of 6, hexagonal cells have an H3 resolution of 2.
If \`<zoom>\` is 3 and \`grid_precision\` is 4, the precision is 7.
At a precision of 7, hexagonal cells have an H3 resolution of 3.

| Precision | Unique tile bins | H3 resolution | Unique hex bins |	Ratio |
| --------- | ---------------- | ------------- | ----------------| ----- |
| 1  | 4                  | 0  | 122             | 30.5           |
| 2  | 16                 | 0  | 122             | 7.625          |
| 3  | 64                 | 1  | 842             | 13.15625       |
| 4  | 256                | 1  | 842             | 3.2890625      |
| 5  | 1024               | 2  | 5882            | 5.744140625    |
| 6  | 4096               | 2  | 5882            | 1.436035156    |
| 7  | 16384              | 3  | 41162           | 2.512329102    |
| 8  | 65536              | 3  | 41162           | 0.6280822754   |
| 9  | 262144             | 4  | 288122          | 1.099098206    |
| 10 | 1048576            | 4  | 288122          | 0.2747745514   |
| 11 | 4194304            | 5  | 2016842         | 0.4808526039   |
| 12 | 16777216           | 6  | 14117882        | 0.8414913416   |
| 13 | 67108864           | 6  | 14117882        | 0.2103728354   |
| 14 | 268435456          | 7  | 98825162        | 0.3681524172   |
| 15 | 1073741824         | 8  | 691776122       | 0.644266719    |
| 16 | 4294967296         | 8  | 691776122       | 0.1610666797   |
| 17 | 17179869184        | 9  | 4842432842      | 0.2818666889   |
| 18 | 68719476736        | 10 | 33897029882     | 0.4932667053   |
| 19 | 274877906944       | 11 | 237279209162    | 0.8632167343   |
| 20 | 1099511627776      | 11 | 237279209162    | 0.2158041836   |
| 21 | 4398046511104      | 12 | 1660954464122   | 0.3776573213   |
| 22 | 17592186044416     | 13 | 11626681248842  | 0.6609003122   |
| 23 | 70368744177664     | 13 | 11626681248842  | 0.165225078    |
| 24 | 281474976710656    | 14 | 81386768741882  | 0.2891438866   |
| 25 | 1125899906842620   | 15 | 569707381193162 | 0.5060018015   |
| 26 | 4503599627370500   | 15 | 569707381193162 | 0.1265004504   |
| 27 | 18014398509482000  | 15 | 569707381193162 | 0.03162511259  |
| 28 | 72057594037927900  | 15 | 569707381193162 | 0.007906278149 |
| 29 | 288230376151712000 | 15 | 569707381193162 | 0.001976569537 |

Hexagonal cells don't align perfectly on a vector tile.
Some cells may intersect more than one vector tile.
To compute the H3 resolution for each precision, Elasticsearch compares the average density of hexagonal bins at each resolution with the average density of tile bins at each zoom level.
Elasticsearch uses the H3 resolution that is closest to the corresponding geotile density.

Learn how to use the vector tile search API with practical examples in the [Vector tile search examples](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/vector-tile-search) guide.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-mvt`,
  methods: ['POST', 'GET'],
  patterns: ['{index}/_mvt/{field}/{zoom}/{x}/{y}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-mvt',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'field', 'zoom', 'x', 'y'],
    urlParams: [
      'exact_bounds',
      'extent',
      'grid_agg',
      'grid_precision',
      'grid_type',
      'size',
      'track_total_hits',
      'with_labels',
    ],
    bodyParams: [
      'aggs',
      'buffer',
      'exact_bounds',
      'extent',
      'fields',
      'grid_agg',
      'grid_precision',
      'grid_type',
      'query',
      'runtime_mappings',
      'size',
      'sort',
      'track_total_hits',
      'with_labels',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(search_mvt_request, 'body'),
      ...getShapeAt(search_mvt_request, 'path'),
      ...getShapeAt(search_mvt_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_mvt1_request, 'body'),
      ...getShapeAt(search_mvt1_request, 'path'),
      ...getShapeAt(search_mvt1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([search_mvt_response, search_mvt1_response]),
};
