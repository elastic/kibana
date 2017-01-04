import { get, partial } from 'lodash';
import pipelineConverterProvider from '../../../../lib/pipelines/pipeline/converter';
import handleESError from '../../../../lib/handle_es_error';

export default (server) => {
  const pipelineConverter = pipelineConverterProvider(server);
  const kibanaIndex = server.config().get('kibana.index');

  function handlePipelineResponse(response, metaResponse) {
    const kibanaPipeline = pipelineConverter.esToKibana(response);

    kibanaPipeline.sample_index = get(metaResponse, '_source.sample-index', 0);
    kibanaPipeline.samples = get(metaResponse, '_source.samples', []);

    return kibanaPipeline;
  }

  server.route({
    path: '/api/kibana/pipelines/pipeline/{id}',
    method: 'GET',
    handler: function (request, reply) {
      const boundCallWithRequest = partial(server.plugins.elasticsearch.callWithRequest, request);

      return boundCallWithRequest('transport.request', {
        path: `/_ingest/pipeline/${request.params.id}`,
        method: 'GET'
      })
      .then((response) => {
        return boundCallWithRequest('get', {
          index: kibanaIndex,
          type: 'pipeline-meta',
          id: request.params.id
        })
        .catch((error) => {
          if (error.status === 404) {
            return;
          }
          throw error;
        })
        .then(partial(handlePipelineResponse, response));
      })
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
