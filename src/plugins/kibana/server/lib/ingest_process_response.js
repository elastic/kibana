const _ = require('lodash');

function translateError(esError) {
  const rootCause = _.get(esError, 'root_cause[0]');

  return _.get(rootCause, 'reason') || _.get(rootCause, 'type');
}

export default function ingestProcessResponse(pipeline, err, resp) {
  const results = pipeline.processors.map((processor) => {
    return {
      processorId: processor.processorId,
      output: processor.outputObject,
      error: undefined
    };
  });

  if (resp.error) {
    const processorId = _.get(resp.error, 'root_cause[0].header.processor_tag');
    const message = _.get(resp.error, 'root_cause[0].reason');
    const badResult = _.find(results, { 'processorId': processorId });

    badResult.output = undefined;
    badResult.error = { isNested: false, message: message };
  } else {
    const processorResults = _.get(resp, 'docs[0].processor_results');
    processorResults.forEach((processorResult) => {
      const processorId = _.get(processorResult, 'tag');
      const output = _.get(processorResult, 'doc._source');
      const error = _.get(processorResult, 'error');
      const errorMessage = translateError(error);
      const badResult = _.find(results, { 'processorId': processorId });

      badResult.output = output;
      badResult.error = errorMessage ? { isNested: false, message: errorMessage } : undefined;
    });
  }

  const errorIndex = _.findIndex(results, (result) => { return result.error !== undefined; });
  if (errorIndex !== -1) {
    for (let i = errorIndex + 1; i < results.length; i++) {
      const badResult = results[i];

      badResult.output = undefined;
      badResult.error = { isNested: true, message: 'Invalid Parent Processor' };
    }
  }

  return results;
};
