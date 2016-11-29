const _ = require('lodash');

function buildError(error) {
  const errorMessage =  _.get(error, 'root_cause[0].reason') || _.get(error, 'root_cause[0].type');
  if (!errorMessage) return;

  return {
    compile: false,
    message: errorMessage
  };
}

export default function processESIngestSimulateResponse(resp) {
  const processorResults = _.get(resp, 'docs[0].processor_results');
  const results = processorResults.map((processorResult) => {
    return {
      processorId: _.get(processorResult, 'tag'),
      output: _.get(processorResult, 'doc._source'),
      error: buildError(_.get(processorResult, 'error'))
    };
  });

  return results;
};
