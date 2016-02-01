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
    console.log(resp.error);
    //TODO: Hopefully currentProcessorId can go away if this new error flow returns
    //the invalid processor id.
    //TODO: process this new type of message after you get new version of simulate.
    const message = 'There was an error compiling the pipeline.';
    const badResult = _.find(results, { 'processorId': pipeline.currentProcessorId });

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
