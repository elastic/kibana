var _ = require('lodash');
var moment = require('moment');
var toMS = require('../lib/to_milliseconds.js');
var Datasource = require('../lib/classes/datasource');

function buildRequest(config, tlConfig) {

  var filter = {range:{}};
  filter.range[config.timefield] = {gte: tlConfig.time.from, lte: tlConfig.time.to, format: 'epoch_millis'};

  var searchRequest = {
    index: config.index,
    body: {
      query: {
        filtered: {
          query: {
            query_string: {
              query: config.q
            }
          },
          filter: filter
        }
      },
      aggs: {
        series: {
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
      },
      size: 0
    }
  };

  if (config.metric) {
    var metric = config.metric.split(':');
    if (metric[0] && metric[1]) {
      searchRequest.body.aggs.series.aggs = {metric: {}};
      searchRequest.body.aggs.series.aggs.metric[metric[0]] = {field: metric[1]};
    } else {
      throw new Error ('`metric` requires metric:field');
    }
  }

  return searchRequest;
}

module.exports = new Datasource('es', {
  args: [
    {
      name: 'q',
      types: ['string', 'null'],
      help: 'Query in lucene query string syntax'
    },
    {
      name: 'metric',
      types: ['string', 'null'],
      help: 'An elasticsearch single value metric agg, eg avg, sum, min, max or cardinality'
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
      name: 'interval', // You really shouldn't use this, use the interval picker instead
      types: ['string', 'null'],
      help: 'Interval to use for date histogram **DO NOT USE THIS**. Its fun for debugging fit functions, but you really should use the interval picker'
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
      index: tlConfig.file.es.default_index,
      timefield: tlConfig.file.es.timefield,
      interval: tlConfig.time.interval,
      url: tlConfig.file.es.url,
      fit: 'nearest'
    });

    if (!tlConfig.file.es.allow_url_parameter && args.byName.url) {
      throw new Error('url= is not allowed');
    }

    var callWithRequest = tlConfig.server.plugins.elasticsearch.callWithRequest;

    var body = buildRequest(config, tlConfig);

    return callWithRequest(tlConfig.request, 'search', body).then(function (resp) {
      if (!resp._shards.total) throw new Error('Elasticsearch index not found: ' + config.index);

      var data = _.map(resp.aggregations.series.buckets, function (bucket) {
        var value;
        if (resp.aggregations.series.buckets[0].metric != null) {
          value = bucket.metric.value;
        } else {
          value = bucket.doc_count;
        }
        return [bucket.key, value];
      });

      return {
        type: 'seriesList',
        list: [{
          data:  data,
          type: 'series',
          fit: config.fit,
          _meta: {
            es_request: body
          },
          //cacheKey: cacheKey,
          label: config.q
        }]
      };
    });
  }
});

