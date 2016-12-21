import _ from 'lodash';
import moment from 'moment';

export default (req, indexPattern = '*', timeField = '@timestamp') => {
  const { server } = req;
  const { callWithRequest } = server.plugins.elasticsearch;
  const config = server.config();
  const from = moment.utc(req.payload.timerange.min);
  const to = moment.utc(req.payload.timerange.max);

  const indexConstraints = {};
  indexConstraints[timeField] = {
    max_value: { gte: to.toISOString() },
    min_value: { lte: from.toISOString() }
  };

  const params = {
    index: indexPattern,
    level: 'indices',
    ignoreUnavailable: true,
    body: {
      fields: [timeField],
      index_constraints: indexConstraints
    }
  };

  return callWithRequest(req, 'fieldStats', params)
    .then(resp => {
      const indices = _.map(resp.indices, (_info, index) => index);
      if (indices.length === 0) {
        // there are no relevant indices for the given timeframe in the data
        return [];
      }
      return indices;
    });
};
