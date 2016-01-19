const app = require('ui/modules').get('kibana');
const _ = require('lodash');

const Logger = require('../lib/logger');
const logger = new Logger('ingest service', false);

app.service('ingest', function ($http) {
  return {
    simulatePipeline: simulatePipeline
  };

  function buildBody(sourceObject, processors) {
    const body = {
      'pipeline': {
        'processors': []
      },
      'docs': [
        {
          _source: sourceObject
        }
      ]
    };

    processors.forEach((processor) => {
      body.pipeline.processors.push(processor.getDefinition());
    });

    return body;
  }

  function translateError(esError) {
    const root_cause = _.get(esError, 'root_cause[0]');

    return _.get(root_cause, 'reason') || _.get(root_cause, 'type');
  }

  function simulatePipeline(pipeline) {
    const body = buildBody(pipeline.rootObject, pipeline.processors);

    logger.log('simulate request', body);

    //TODO: How to handle errors
    return $http.post(`/api/kibana/simulate`, body)
    .then(function (result) {
      if (!result.data) {
        logger.log('WEIRD WEIRD WEIRD!!! There IS no result object?', result);
        return;
      }

      //prepopulate the response with 'invalid parent processor' state
      //because if a processor fails in the middle of the pipeline,
      //_simulate does not return results for any child processors
      const outputDefaults = pipeline.processors.map((processor) => {
        return {
          processorId: processor.processorId,
          output: undefined,
          error: 'invalid parent processor'
        };
      });

      const processorResults = _.get(result, 'data.docs[0].processor_results');
      processorResults.forEach((processorResult) => {
        const processorId = _.get(processorResult, 'processor_id');
        const output = _.get(processorResult, 'doc._source');
        const error = _.get(processorResult, 'error');
        const errorMessage = translateError(error);

        const outputDefault = _.find(outputDefaults, { 'processorId': processorId });
        outputDefault.output = output;
        outputDefault.error = errorMessage;
      });

      return outputDefaults;
    });
  }
});
