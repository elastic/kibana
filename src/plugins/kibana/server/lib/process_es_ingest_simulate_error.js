const _ = require('lodash');

function buildError(error) {
  const errorMessage = _.get(error, 'body.error.root_cause[0].reason');
  if (!errorMessage) throw error;

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
