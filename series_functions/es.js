var _ = require('lodash');
var moment = require('moment');
var toMS = require('../lib/to_milliseconds.js');
var Datasource = require('../lib/classes/datasource');

function createDateAgg(config, tlConfig) {
  var dateAgg = {
    time_buckets: {
      meta: {type: 'time_buckets'},
      date_histogram: {
        field: config.timefield,
        interval: config.interval,
        time_zone: tlConfig.time.timezone,
        extended_bounds: {
          min: tlConfig.time.from,
          max: tlConfig.time.to
        },
        min_doc_count: 0
      }
    }
  };

  dateAgg.time_buckets.aggs = {};
  _.each(config.metric, function (metric, i) {
    var metric = metric.split(':');
    if (metric[0] === 'count') {
      // This is pretty lame, but its how the "doc_count" metric has to be implemented at the moment
      // It simplifies the aggregation tree walking code considerably
      dateAgg.time_buckets.aggs[metric] = {
        bucket_script: {
          buckets_path: '_count',
          script: {inline: '_value', lang: 'expression'}
        }
      };
    } else if (metric[0] && metric[1]) {
      var metricName = metric[0] + '(' + metric[1] + ')';
      dateAgg.time_buckets.aggs[metricName] = {};
      dateAgg.time_buckets.aggs[metricName][metric[0]] = {field: metric[1]};
    } else {
      throw new Error ('`metric` requires metric:field or simply count');
    }
  });

  return dateAgg;
}

function buildRequest(config, tlConfig) {

  var bool = {must: [], must_not: []};

  if (config.kibana) {
    var kibanaFilters = _.get(tlConfig, 'request.payload.extended.es.filters') || [];
    bool.must = _.chain(kibanaFilters).filter(function (filter) {return !filter.meta.negate;}).pluck('query').values();
    bool.must_not = _.chain(kibanaFilters).filter(function (filter) {return filter.meta.negate;}).pluck('query').values();
  }

  var timeFilter = {range:{}};
  timeFilter.range[config.timefield] = {gte: tlConfig.time.from, lte: tlConfig.time.to, format: 'epoch_millis'};
  bool.must.push(timeFilter);


  var aggs = {
    'q': {
      meta: {type: 'split'},
      filters: {
        filters: _.chain(config.q).map(function (q) {
          return [q, {query_string:{query: q}}];
        }).zipObject(),
      },
      aggs: {}
    }
  };

  var aggCursor = aggs.q.aggs;

  _.each(config.split, function (field, i) {
    var field = field.split(':');
    if (field[0] && field[1]) {
      aggCursor[field[0]] = {
        meta: {type: 'split'},
        terms: {
          field: field[0],
          size: field[1]
        },
        aggs: {}
      };
      aggCursor = aggCursor[field[0]].aggs;
    } else {
      throw new Error ('`split` requires field:limit');
    }
  });

  _.assign(aggCursor, createDateAgg(config, tlConfig));



  return {
    index: config.index,
    body: {
      query: {
        bool: bool
      },
      aggs: aggs,
      size: 0
    }
  };
}

module.exports = new Datasource('es', {
  args: [
    {
      name: 'q',
      types: ['string', 'null'],
      multi: true,
      help: 'Query in lucene query string syntax'
    },
    {
      name: 'metric',
      types: ['string', 'null'],
      multi: true,
      help: 'An elasticsearch single value metric agg, eg avg, sum, min, max or cardinality, followed by a field.' +
        ' Eg "sum:bytes", or just "count"'
    },
    {
      name: 'split',
      types: ['string', 'null'],
      multi: true,
      help: 'An elasticsearch field to split the series on and a limit. Eg, "hostname:10" to get the top 10 hostnames'
    },
    {
      name: 'index',
      types: ['string', 'null'],
      help: 'Index to query, wildcards accepted'
    },
    {
      name: 'timefield',
      types: ['string', 'null'],
      help: 'Field of type "date" to use for x-axis'
    },
    {
      name: 'kibana',
      types: ['boolean', 'null'],
      help: 'Respect filters on Kibana dashboards. Only has an effect when using on Kibana dashboards'
    },
    {
      name: 'interval', // You really shouldn't use this, use the interval picker instead
      types: ['string', 'null'],
      help: '**DO NOT USE THIS**. Its fun for debugging fit functions, but you really should use the interval picker'
    },
    {
      name: 'url',
      types: ['string', 'null'],
      help: 'Elasticsearch server URL, eg http://localhost:9200'
    }
  ],
  help: 'Pull data from an elasticsearch instance',
  aliases: ['elasticsearch'],
  fn: function esFn(args, tlConfig) {

    var config = _.defaults(_.clone(args.byName), {
      q: '*',
      metric: ['count'],
      index: tlConfig.file.es.default_index,
      timefield: tlConfig.file.es.timefield,
      interval: tlConfig.time.interval,
      kibana: true,
      url: tlConfig.file.es.url,
      fit: 'nearest'
    });

    if (!tlConfig.file.es.allow_url_parameter && args.byName.url) {
      throw new Error('url= is not allowed');
    }

    var callWithRequest = tlConfig.server.plugins.elasticsearch.callWithRequest;

    var body = buildRequest(config, tlConfig);

    function aggResponseToSeriesList(aggs) {

      function flattenBucket(bucket, path, result) {
        result = result || {};
        path = path || [];
        _.forOwn(bucket, function (val, key) {
          if (!_.isPlainObject(val)) return;
          if (_.get(val, 'meta.type') === 'split') {
            _.each(val.buckets, function (bucket, bucketKey) {
              if (bucket.key == null) bucket.key = bucketKey; // For handling "keyed" response formats, eg filters agg
              flattenBucket(bucket, path.concat([key + ':' + bucket.key]), result);
            });
          } else if (_.get(val, 'meta.type') === 'time_buckets') {
            var metrics = timeBucketsToPairs(val.buckets);
            _.each(metrics, function (pairs, metricName) {
              result[path.concat([metricName]).join(' > ')] = pairs;
            });
          }
        });
        return result;
      }

      function timeBucketsToPairs(buckets) {
        var timestamps = _.pluck(buckets, 'key');
        var series = {};
        _.each(buckets, function (bucket) {
          _.forOwn(bucket, function (val, key) {
            if (_.isPlainObject(val)) {
              series[key] = series[key] || [];
              series[key].push(val.value);
            }
          });
        });

        return _.mapValues(series, function (values) {
          return _.zip(timestamps, values);
        });
      }

      return _.map(flattenBucket(aggs), function (values, name) {
        return {
          data: values,
          type: 'series',
          fit: config.fit,
          label: name
        };
      });
    }

    return callWithRequest(tlConfig.request, 'search', body).then(function (resp) {
      if (!resp._shards.total) throw new Error('Elasticsearch index not found: ' + config.index);

      return {
        type: 'seriesList',
        list: aggResponseToSeriesList(resp.aggregations)
      };
    });
  }
});
