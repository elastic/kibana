const _ = require('lodash');

export default function defineKibanaServerRoutes(server) {
  const client = server.plugins.elasticsearch.client;
  const processor_types = require('../domain/ingest_processor_types');

  function buildSimulateBody(pipeline) {
    const processors = pipeline.processors;
    const body = {
      'pipeline': {
        'processors': []
      },
      'docs': [
        {
          _source: pipeline.rootObject
        }
      ]
    };

    processors.forEach((processor) => {
      const processor_type = _.find(processor_types, { 'typeId': processor.typeId });
      const definition = processor_type.getDefinition.call(processor);
      body.pipeline.processors.push(definition);
    });

    return body;
  }

  server.route({
    path: '/api/kibana/simulate',
    method: 'POST',
    handler: function(request, reply) {
      const client = server.plugins.elasticsearch.client;
      const pipeline = request.payload;
      const body = buildSimulateBody(pipeline);

      client.transport.request({
        path: '_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: body
      },
      function(err, resp) {
        reply(processSimulateResponse(pipeline, err, resp));
      });
    }
  });

  function translateError(esError) {
    const root_cause = _.get(esError, 'root_cause[0]');

    return _.get(root_cause, 'reason') || _.get(root_cause, 'type');
  }

  function processSimulateResponse(pipeline, err, resp) {
    const results = pipeline.processors.map((processor) => {
      return {
        processorId: processor.processorId,
        output: processor.outputObject,
        error: null
      };
    });

    if (resp.error) {
      //TODO: Hopefully currentProcessorId can go away if this new error flow returns
      //the invalid processor id.
      //TODO: process this new type of message after you get new version of simulate.
      const message = 'There was an error compiling the pipeline.';
      const badResult = _.find(results, { 'processorId': pipeline.currentProcessorId });

      badResult.output = null;
      badResult.error = { isNested: false, message: message };
    } else {
      const processorResults = _.get(resp, 'docs[0].processor_results');
      processorResults.forEach((processorResult) => {
        const processorId = _.get(processorResult, 'processor_id');
        const output = _.get(processorResult, 'doc._source');
        const error = _.get(processorResult, 'error');
        const errorMessage = translateError(error);
        const badResult = _.find(results, { 'processorId': processorId });

        badResult.output = output;
        badResult.error = errorMessage ? { isNested: false, message: errorMessage } : null;
      });
    }

    const errorIndex = _.findIndex(results, (result) => { return result.error !== null; });
    console.log('error index: ' + errorIndex);
    if (errorIndex !== -1) {
      for (let i=errorIndex+1; i<results.length; i++) {
        const badResult = results[i];

        badResult.output = null;
        badResult.error = { isNested: true, message: 'Invalid Parent Processor' };
      }
    }

    return results;
  }
}
