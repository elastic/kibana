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
    console.log('******************** err ***********************');
    console.log(err);
    console.log('************************************************');
    console.log('******************** resp ***********************');
    console.log(resp);
    console.log('************************************************');

    //TODO: this is just stub code... need to handle bad states correctly.
    // if (!resp.data) {
    //   logger.log('WEIRD WEIRD WEIRD!!! There IS no result object?', result);
    //   return;
    // }

    //prepopulate the response with 'invalid parent processor' state
    //because if a processor fails in the middle of the pipeline,
    //_simulate does not return results for any child processors
    const outputDefaults = pipeline.processors.map((processor) => {
      return {
        processorId: processor.processorId,
        output: undefined,
        error: { isNested: true, message: 'invalid parent processor' }
      };
    });

    const processorResults = _.get(resp, 'docs[0].processor_results');
    processorResults.forEach((processorResult) => {
      const processorId = _.get(processorResult, 'processor_id');
      const output = _.get(processorResult, 'doc._source');
      const error = _.get(processorResult, 'error');
      const errorMessage = translateError(error);

      const outputDefault = _.find(outputDefaults, { 'processorId': processorId });
      outputDefault.output = output;
      outputDefault.error = undefined;
      if (errorMessage) {
        outputDefault.error = { isNested: false, message: errorMessage };
      }
    });

    return outputDefaults;
  }
}
