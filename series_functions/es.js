var _ = require('lodash');
var moment = require('moment');
var toMS = require('../lib/to_milliseconds.js');
var Datasource = require('../lib/classes/datasource');

var offset = {
  request: function (request, offset) {
    if (offset) {
      var rangeFilter = request.body.query.filtered.filter.range;
      var timeField = _.keys(request.body.query.filtered.filter.range)[0];

      rangeFilter[timeField].gte = offsetTime(rangeFilter[timeField].gte, offset);
      rangeFilter[timeField].lte = offsetTime(rangeFilter[timeField].lte, offset);

      request.body.aggs.series.date_histogram.extended_bounds.min = rangeFilter[timeField].gte;
      request.body.aggs.series.date_histogram.extended_bounds.max = rangeFilter[timeField].lte;

    } else {
      throw new Error ('`offset` requires an offset, eg -2w or +3M');
    }
    return request;
  },
  result: function (response, offset) {
    if (offset) {
      response = _.map(response, function (point) {
        return [offsetTime(point[0], offset, true), point[1]];
      });
    }
    return response;
  }
};

// usually reverse = false on the request, true on the response
function offsetTime(milliseconds, offset, reverse) {
  if (!offset.match(/[-+][0-9]+[mshdwMy]/g)) {
    throw new Error ('Malformed `offset` at ' + offset);
  }
  var parts = offset.match(/[-+]|[0-9]+|[mshdwMy]/g);

  var add = parts[0] === '+';
  add = reverse ? !add : add;

  var mode = add ? 'add' : 'subtract';

  var momentObj = moment(milliseconds)[mode](parts[1], parts[2]);
  return momentObj.valueOf();
}

function buildRequest(config, tlConfig) {

  var filter = {range:{}};
  filter.range[config.timefield] = {gte: tlConfig.time.from, lte: tlConfig.time.to, format: 'epoch_millis'};

  var searchRequest = {
    index: config.index,
    //filterPath: 'aggregations.series.buckets.key,aggregations.series.buckets.doc_count,aggregations.series.buckets.metric.value',
    //searchType: 'count',
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

  if (config.offset) {
    searchRequest = offset.request(searchRequest, config.offset);
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
      name: 'offset',
      types: ['string', 'null']
    },
    {
      name: 'interval', // You really shouldn't use this, use the interval picker instead
      types: ['string', 'null']
    },
    {
      name: 'url',
      types: ['string', 'null']
    },
    {
      name: 'fit', // If you went around fiddling with interval you probably need a better fit function
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

    var body = buildRequest(config, tlConfig);
    return client.search(body).then(function (resp) {

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

      if (config.offset) {
        data = offset.result(data, config.offset);
      }

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
    }).catch(function (e) {
      if (e.message.root_cause) {
        throw new Error(e.message.root_cause[0].reason);
      } else {
        throw e;
      }
    });
  }
});

