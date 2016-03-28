const _ = require('lodash');

function buildError(error) {
  const errorMessage = _.get(error, 'body.error.reason');

  return {
    compile: true,
    message: errorMessage
  };
}

export default function processESIngestSimulateError(dirtyProcessorId, error) {
  const results = [
    {
      processorId: dirtyProcessorId,
      error: buildError(error)
    }
  ];

  return results;
}
