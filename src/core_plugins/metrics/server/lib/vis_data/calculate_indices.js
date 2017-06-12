import _ from 'lodash';
import offsetTime from './offset_time';

export function getParams(req, indexPattern, timeField, offsetBy) {
  const { from, to } = offsetTime(req, offsetBy);
  const indexConstraints = {
    [timeField]: {
      max_value: { gte: from.valueOf(), format: 'epoch_millis' },
      min_value: { lte: to.valueOf(), format: 'epoch_millis' }
    },
  };

  return {
    index: indexPattern,
    level: 'indices',
    ignoreUnavailable: true,
    body: {
      fields: [timeField],
      index_constraints: indexConstraints
    }
  };
}

export function handleResponse(indexPattern) {
  return resp => {
    const indices = _.map(resp.indices, (_info, index) => index);
    if (indices.length === 0) {
      // there are no relevant indices for the given timeframe in the data
      return [indexPattern];
    }
    return indices;
  };
}

export function calculateIndices(req, indexPattern = '*', timeField = '@timestamp', offsetBy) {
  const { server } = req;
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const params = getParams(req, indexPattern, timeField, offsetBy);
  return callWithRequest(req, 'fieldStats', params)
    .then(handleResponse(indexPattern));
}
