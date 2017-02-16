const  _ = require('lodash');
const createDateAgg = require('./create_date_agg');

module.exports =  function buildRequest(config, tlConfig) {


  const bool = { must: [] };

  const timeFilter = { range:{} };
  timeFilter.range[config.timefield] = { gte: tlConfig.time.from, lte: tlConfig.time.to, format: 'epoch_millis' };
  bool.must.push(timeFilter);

  // Use the kibana filter bar filters
  if (config.kibana) {
    bool.filter = _.get(tlConfig, 'request.payload.extended.es.filter');
  }

  const filters = _.chain(config.q).map(function (q) {
    return [q, { query_string:{ query: q } }];
  }).fromPairs().value();


  const aggs = {
    'q': {
      meta: { type: 'queries' },
      filters: {
        filters: filters,
      },
      aggs: {}
    }
  };

  let aggCursor = aggs.q.aggs;

  _.each(config.split, function (clause, i) {
    clause = clause.split(':');
    if (clause[0] && clause[1]) {
      const field = clause[0];
      aggCursor[field] = {
        meta: { type: 'terms', field: field },
        terms: {
          field: field,
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
