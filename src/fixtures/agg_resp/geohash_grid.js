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
      return _.sample(geoHashCharts, 3).join('');
    })
    .sort()
    .map(function (geoHash) {
      const count = _.random(1, 5000);

      docCount += count;

      return {
        key: geoHash,
        doc_count: count,
        1: {
          value: 2048 + i
        }
      };
    });

    return {
      key: 'tag ' + (i + 1),
      doc_count: docCount,
      3: {
        buckets: buckets
      },
      1: {
        value: 1000 + i
      }
    };
  });

  return {
    took: 3,
    timed_out: false,
    _shards: {
      total: 4,
      successful: 4,
      failed: 0
    },
    hits: {
      total: 298,
      max_score: 0.0,
      hits: []
    },
    aggregations: {
      2: {
        buckets: tags
      }
    }
  };
}
