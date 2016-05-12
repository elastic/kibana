import _ from 'lodash';
import esToKibanaPipelineConverter from '../../../lib/converters/ingest_pipeline_api_es_to_kibana_converter';
import handleESError from '../../../lib/handle_es_error';

function handlePipelinesResponse(response) {
  const pipelines = _.get(response, 'pipelines');
  const results = _.map(pipelines, 'id');

  return results;
}

function handlePipelineResponse(response) {
  const esPipeline =  _.get(response, 'pipelines[0]');
  const kibanaPipeline = esToKibanaPipelineConverter(esPipeline);
  return kibanaPipeline;
}

export function registerPipelines(server) {
  server.route({
    path: '/api/kibana/ingest/pipelines',
    method: 'GET',
    handler: function (request, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, request);

      return boundCallWithRequest('transport.request', {
        path: '/_ingest/pipeline/*',
        method: 'GET'
      })
      .then(handlePipelinesResponse)
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });

  server.route({
    path: '/api/kibana/ingest/pipeline/{id}',
    method: 'GET',
    handler: function (request, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, request);

      return boundCallWithRequest('transport.request', {
        path: `/_ingest/pipeline/${request.params.id}`,
        method: 'GET'
      })
      .then(handlePipelineResponse)
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
