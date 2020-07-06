/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
export default function GeoHashGridAggResponseFixture() {
  // for vis:
  //
  // vis = new Vis(indexPattern, {
  //   type: 'tile_map',
  //   aggs:[
  //     { schema: 'metric', type: 'avg', params: { field: 'bytes' } },
  //     { schema: 'split', type: 'terms', params: { field: '@tags', size: 10 } },
  //     { schema: 'segment', type: 'geohash_grid', params: { field: 'geo.coordinates', precision: 3 } }
  //   ],
  //   params: {
  //     isDesaturated: true,
  //     mapType: 'Scaled%20Circle%20Markers'
  //   },
  // });

  const geoHashCharts = _.union(
    _.range(48, 57), // 0-9
    _.range(65, 90), // A-Z
    _.range(97, 122) // a-z
  );

  const tags = _.times(_.random(4, 20), function (i) {
    // random number of tags
    let docCount = 0;
    const buckets = _.times(_.random(40, 200), function () {
      return _.sampleSize(geoHashCharts, 3).join('');
    })
      .sort()
      .map(function (geoHash) {
        const count = _.random(1, 5000);

        docCount += count;

        return {
          key: geoHash,
          doc_count: count,
          1: {
            value: 2048 + i,
          },
        };
      });

    return {
      key: 'tag ' + (i + 1),
      doc_count: docCount,
      3: {
        buckets: buckets,
      },
      1: {
        value: 1000 + i,
      },
    };
  });

  return {
    took: 3,
    timed_out: false,
    _shards: {
      total: 4,
      successful: 4,
      failed: 0,
    },
    hits: {
      total: 298,
      max_score: 0.0,
      hits: [],
    },
    aggregations: {
      2: {
        buckets: tags,
      },
    },
  };
}
