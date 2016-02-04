const _ = require('lodash');

function translateError(esError) {
  const rootCause = _.get(esError, 'root_cause[0]');

  return _.get(rootCause, 'reason') || _.get(rootCause, 'type');
}

export function buildRequest(processorTypes, pipeline) {
  if (processorTypes === undefined ||
      !_.isArray(processorTypes) ||
      processorTypes.length === 0) {
    throw new Error('requires a processorTypes object array argument');
  }

  if (pipeline === undefined || !_.isPlainObject(pipeline)) {
    throw new Error('requires a pipeline object argument');
  }

  if (pipeline.processors === undefined ||
      !_.isArray(pipeline.processors) ||
      pipeline.processors.length === 0) {
    throw new Error('pipeline contains no processors');
  }

  const processors = pipeline.processors;
  const body = {
    'pipeline': {
      'processors': []
    },
    'docs': [
      {
        _source: pipeline.input
      }
    ]
  };

  processors.forEach((processor) => {
    const processorType = _.find(processorTypes, { 'typeId': processor.typeId });
    const definition = processorType.getDefinition(processor);
    body.pipeline.processors.push(definition);
  });

  return body;
};

export function processResponse(pipeline, err, resp) {
  const results = pipeline.processors.map((processor) => {
    return {
      processorId: processor.processorId,
      output: processor.outputObject,
      error: undefined
    };
  });

  const processorResults = _.get(resp, 'docs[0].processor_results');
  processorResults.forEach((processorResult) => {
    const processorId = _.get(processorResult, 'tag');
    const output = _.get(processorResult, 'doc._source');
    const error = _.get(processorResult, 'error');
    const errorMessage = translateError(error);
    const badResult = _.find(results, { 'processorId': processorId });

    badResult.output = errorMessage ? undefined : output;
    badResult.error = errorMessage ? { isNested: false, message: errorMessage } : undefined;
  });

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
