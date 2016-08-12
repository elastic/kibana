var  _ = require('lodash');
var createDateAgg = require('./create_date_agg');

module.exports =  function buildRequest(config, tlConfig) {

  var bool = {must: [], must_not: []};

  var timeFilter = {range:{}};
  timeFilter.range[config.timefield] = {gte: tlConfig.time.from, lte: tlConfig.time.to, format: 'epoch_millis'};
  bool.must.push(timeFilter);

  // Use the kibana filter bar filters
  if (config.kibana) {
    bool.filter = _.get(tlConfig, 'request.payload.extended.es.filter') || {};
  }

  var aggs = {
    'q': {
      meta: {type: 'split'},
      filters: {
        filters: _.chain(config.q).map(function (q) {
          return [q, {query_string:{query: q}}];
        }).zipObject().value(),
      },
      aggs: {}
    }
  };

  var aggCursor = aggs.q.aggs;

  _.each(config.split, function (clause, i) {
    var clause = clause.split(':');
    if (clause[0] && clause[1]) {
      aggCursor[clause[0]] = {
        meta: {type: 'split'},
        terms: {
          field: clause[0],
          size: parseInt(clause[1], 10)
        },
        aggs: {}
      };
      aggCursor = aggCursor[clause[0]].aggs;
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
