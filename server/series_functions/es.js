var _ = require('lodash');
var moment = require('moment');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
});

module.exports = {
  dataSource: true,
  args: [
    {
      name: 'query',
      types: ['string']
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
      name: 'offset',
      types: ['string', 'null']
    }
  ],
  help: 'Pull data from an elasticsearch instance',
  aliases: ['elasticsearch'],
  fn: function esFn (args, tlConfig) {
    var config = {
      query: args[0],
      metric: args[1],
      index: args[2],
      offset: args[3]
    };

    return client.search(buildRequest(config, tlConfig)).then(function (resp) {

      var data = _.map(resp.aggregations.series.buckets, function (bucket) {
        var value;
        if (resp.aggregations.series.buckets[0].metric) {
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
          //cacheKey: cacheKey,
          label: config.query
        }]
      };
    }).catch(function (e) {
      throw new Error(e.message.root_cause[0].reason);
    });
  }
};

function buildRequest (config, tlConfig) {
  var filter = {range:{}};
  filter.range[tlConfig.time.field] = {gte: tlConfig.time.min, lte: tlConfig.time.max, format: 'epoch_millis'};

  var searchRequest = {
    index: config.index,
    filterPath: 'aggregations.series.buckets.key,aggregations.series.buckets.doc_count,aggregations.series.buckets.metric.value',
    searchType: 'count',
    body: {
      query: {
        filtered: {
          query: {
            query_string: {
              query: config.query
            }
          },
          filter: filter
      }
      },
      aggs: {
        series: {
          date_histogram: {
            field: tlConfig.time.field,
            interval: tlConfig.time.interval,
            extended_bounds: {
              min: tlConfig.time.min,
              max: tlConfig.time.max
            },
            min_doc_count: 0
          }
        }
      }
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

function offsetTime (milliseconds, offset, reverse) {
  if (!offset.match(/[-+][0-9]+[msdwMy]/g)) {
    throw new Error ('Malformed `offset` at ' + offset);
  }
  var parts = offset.match(/[-+]|[0-9]+|[msdwMy]/g);

  var add = parts[0] === '+';
  add = reverse ? !add : add;

  var mode = add ? 'add' : 'subtract';

  var momentObj = moment(milliseconds)[mode](parts[1], parts[2]);
  return momentObj.valueOf();
}

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