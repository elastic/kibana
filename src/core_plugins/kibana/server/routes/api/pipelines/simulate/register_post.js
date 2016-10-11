import { map, partial } from 'lodash';
import handleESError from '../../../../lib/handle_es_error';
import pipelineSchema from '../../../../lib/pipelines/pipeline/schema';
import simulateConverterProvider from '../../../../lib/pipelines/simulate/converter';

export default (server) => {
  const simulateConverter = simulateConverterProvider(server);
  const handleResponse = simulateConverter.esResponseToKibana;
  const handleError = simulateConverter.esErrorToKibana;

  server.route({
    path: '/api/kibana/pipelines/simulate',
    method: 'POST',
    config: {
      validate: {
        payload: pipelineSchema
      }
    },
    handler: function (request, reply) {
      const boundCallWithRequest = partial(server.plugins.elasticsearch.callWithRequest, request);
      const pipelineApiDocument = request.payload;
      const body = simulateConverter.kibanaToEs(pipelineApiDocument);

      console.log(JSON.stringify(body));

      return boundCallWithRequest('transport.request', {
        path: '/_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: body
      })
      .then(handleResponse, handleError)
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
