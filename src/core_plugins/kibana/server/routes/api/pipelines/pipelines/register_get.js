import { partial, forIn, set } from 'lodash';
import pipelineConverterProvider from '../../../../lib/pipelines/pipeline/converter';
import handleESError from '../../../../lib/handle_es_error';

export default (server) => {
  const pipelineConverter = pipelineConverterProvider(server);

  function handleResponse(response) {
    const result = [];
    forIn(response, (esPipelineDetails, pipelineId) => {
      const esPipeline = set({}, pipelineId, esPipelineDetails);
      result.push(pipelineConverter.esToKibana(esPipeline));
    });

    return result;
  }

  function handleError(error) {
    if (error.status === 404) {
      return [];
    } else {
      throw error;
    }
  }

  server.route({
    path: '/api/kibana/pipelines/pipelines',
    method: 'GET',
    handler: function (request, reply) {
      const boundCallWithRequest = partial(server.plugins.elasticsearch.callWithRequest, request);

      return boundCallWithRequest('transport.request', {
        path: `/_ingest/pipeline/*`,
        method: 'GET'
      })
      .then(handleResponse, handleError)
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
