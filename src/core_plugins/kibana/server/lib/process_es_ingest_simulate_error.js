const _ = require('lodash');

function buildError(error) {
  const errorMessage = _.get(error, 'body.error.root_cause[0].reason');
  return {
    compile: true,
    message: errorMessage
  };
}

export default function processESIngestSimulateError(error) {
  const processorId = _.get(error, 'body.error.root_cause[0].header.processor_tag');
  if (!processorId) throw error;

  const results = [
    {
      processorId: processorId,
      error: buildError(error)
    }
  ];

  return results;
}
