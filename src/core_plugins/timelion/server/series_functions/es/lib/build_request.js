import _ from 'lodash';
import createDateAgg from './create_date_agg';

export default function buildRequest(config, tlConfig, scriptedFields) {

  const bool = { must: [] };

  const timeFilter = { range: {} };
  timeFilter.range[config.timefield] = { gte: tlConfig.time.from, lte: tlConfig.time.to, format: 'epoch_millis' };
  bool.must.push(timeFilter);

  // Use the kibana filter bar filters
  if (config.kibana) {
    bool.filter = _.get(tlConfig, 'request.payload.extended.es.filter');
  }

  const aggs = {
    'q': {
      meta: { type: 'split' },
      filters: {
        filters: _.chain(config.q).map(function (q) {
          return [q, { query_string: { query: q } }];
        }).zipObject().value(),
      },
      aggs: {}
    }
  };

  let aggCursor = aggs.q.aggs;

  _.each(config.split, function (clause) {
    clause = clause.split(':');
    if (clause[0] && clause[1]) {
      const termsAgg = {
        size: parseInt(clause[1], 10)
      };
      const scriptedField = scriptedFields.find(field => {
        return field.name === clause[0];
      });
      if (scriptedField) {
        termsAgg.script = {
          inline: scriptedField.script,
          lang: scriptedField.lang
        };
      } else {
        termsAgg.field = clause[0];
      }
      aggCursor[clause[0]] = {
        meta: { type: 'split' },
        terms: termsAgg,
        aggs: {}
      };
      aggCursor = aggCursor[clause[0]].aggs;
    } else {
      throw new Error ('`split` requires field:limit');
    }
  });

  _.assign(aggCursor, createDateAgg(config, tlConfig, scriptedFields));


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
