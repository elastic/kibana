var  _ = require('lodash');
var createDateAgg = require('./create_date_agg');

module.exports =  function buildRequest(config, tlConfig) {

  var bool = {must: [], must_not: []};

  var timeFilter = {range:{}};
  timeFilter.range[config.timefield] = {gte: tlConfig.time.from, lte: tlConfig.time.to, format: 'epoch_millis'};
  bool.must.push(timeFilter);

  if (config.kibana) {
    var kibanaFilters = _.get(tlConfig, 'request.payload.extended.es.filters') || [];
    bool.must.push
      .apply(bool.must, _.chain(kibanaFilters).filter(function (filter) {return !filter.meta.negate;}).pluck('query').value());

    bool.must_not.push
      .apply(bool.must_not, _.chain(kibanaFilters).filter(function (filter) {return filter.meta.negate;}).pluck('query').value());
  }

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
};
