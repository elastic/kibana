import _ from 'lodash';
import moment from 'moment';
import offsetTime from './vis_data/offset_time';

function getParams(req, indexPattern, timeField, offsetBy) {

  const { from, to } = offsetTime(req, offsetBy);

  const indexConstraints = {};
  indexConstraints[timeField] = {
    max_value: { gte: from.toISOString() },
    min_value: { lte: to.toISOString() }
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

function handleResponse(resp) {
  const indices = _.map(resp.indices, (_info, index) => index);
  if (indices.length === 0) {
    // there are no relevant indices for the given timeframe in the data
    return [];
  }
  return indices;
}

function calculateIndices(req, indexPattern = '*', timeField = '@timestamp', offsetBy) {
  const { server } = req;
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const params = getParams(req, indexPattern, timeField, offsetBy);
  return callWithRequest(req, 'fieldStats', params)
    .then(handleResponse);
}


calculateIndices.handleResponse = handleResponse;
calculateIndices.getParams = getParams;
export default calculateIndices;
