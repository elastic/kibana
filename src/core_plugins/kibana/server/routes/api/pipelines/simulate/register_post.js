import { map, partial } from 'lodash';
import handleESError from '../../../../lib/handle_es_error';
import simulateSchema from '../../../../lib/pipelines/simulate/schema';
import simulateConverterProvider from '../../../../lib/pipelines/simulate/converter';
import { keysToSnakeCaseShallow } from '../../../../../common/lib/case_conversion';

export default (server) => {
  const simulateConverter = simulateConverterProvider(server);

  function handleResponse(resp) {
    return simulateConverter.esResponseToKibana(resp);
  };

  function handleError(error) {
    return simulateConverter.esErrorToKibana(error);
  }

  server.route({
    path: '/api/kibana/pipelines/simulate',
    method: 'POST',
    config: {
      validate: {
        payload: simulateSchema
      }
    },
    handler: function (request, reply) {
      const boundCallWithRequest = partial(server.plugins.elasticsearch.callWithRequest, request);
      const simulateApiDocument = request.payload;
      const body = simulateConverter.kibanaToEs(simulateApiDocument);

      console.log(JSON.stringify(body));

      return boundCallWithRequest('transport.request', {
        path: '/_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: body
      })
      .then(handleResponse, handleError)
      .then((processors) => map(processors, keysToSnakeCaseShallow))
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
