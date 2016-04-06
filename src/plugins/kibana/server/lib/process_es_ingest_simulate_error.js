const _ = require('lodash');

function buildError(error) {
  const processorId = _.get(error, 'body.error.root_cause[0].header.processor_tag');
  if (!processorId) throw error;

  const errorMessage = _.get(error, 'body.error.root_cause[0].reason');
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
