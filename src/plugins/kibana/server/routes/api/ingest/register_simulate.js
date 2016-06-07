import _ from 'lodash';
import handleESError from '../../../lib/handle_es_error';
import simulateSchema from '../../../lib/ingest/simulate/schema';
import simulateConverter from '../../../lib/ingest/simulate/converter';
import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../../../../common/lib/case_conversion';

export function handleResponse(resp) {
  const processorResults = _.get(resp, 'docs[0].processor_results');
  const results = processorResults.map((processorResult) => {
    let processorError;
    const errorMessage =
      _.get(processorResult, 'error.root_cause[0].reason') ||
      _.get(processorResult, 'error.root_cause[0].type');

    if (errorMessage) {
      processorError = {
        compile: false,
        message: errorMessage
      };
    }

    return {
      processorId: _.get(processorResult, 'tag'),
      output: _.get(processorResult, 'doc._source'),
      error: processorError
    };
  });

  return results;
};

export function handleError(error) {
  const processorId = _.get(error, 'body.error.root_cause[0].header.processor_tag');
  if (!processorId) throw error;

  const errorMessage = _.get(error, 'body.error.root_cause[0].reason');
  const processorError = {
    compile: true,
    message: errorMessage
  };

  const results = [
    {
      processorId: processorId,
      error: processorError
    }
  ];

  return results;
}

export function registerSimulate(server) {
  server.route({
    path: '/api/kibana/ingest/simulate',
    method: 'POST',
    config: {
      validate: {
        payload: simulateSchema
      }
    },
    handler: function (request, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, request);
      const simulateApiDocument = request.payload;
      const body = simulateConverter.kibanaToEs(simulateApiDocument);

      return boundCallWithRequest('transport.request', {
        path: '/_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: body
      })
      .then(handleResponse, handleError)
      .then((processors) => _.map(processors, keysToSnakeCaseShallow))
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
