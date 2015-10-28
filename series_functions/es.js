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

function validateInterval(interval) {
  console.log(toMS(interval));
}

module.exports = new Datasource('es', {
  args: [
    {
      name: 'q',
      types: ['string', 'null']
    },
    {
      name: 'metric',
      types: ['string', 'null']
    },
    {
      name: 'index',
      types: ['string', 'null']
    },
    {
      name: 'timefield',
      types: ['string', 'null']
    },
    {
      name: 'interval', // You really shouldn't use this, use the interval picker instead
      types: ['string', 'null']
    },
    {
      name: 'url',
      types: ['string', 'null']
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

    var client = tlConfig.server.plugins.elasticsearch.client;
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

