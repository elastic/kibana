import { get } from 'lodash';
import pipelineConverterProvider from '../pipeline/converter';

export default function (server) {
  const pipelineConverter = pipelineConverterProvider(server);

  return {
    kibanaToEs: function (simulateApiDocument) {
      return {
        pipeline: pipelineConverter.kibanaToEs(simulateApiDocument.pipeline),
        docs: [
          {
            _source: simulateApiDocument.input
          }
        ]
      };
    },
    esResponseToKibana: function (simulateEsDocument) {
      const processorResults = get(simulateEsDocument, 'docs[0].processor_results');
      const results = processorResults.map((processorResult) => {
        let processorError;
        const errorMessage =
          get(processorResult, 'error.root_cause[0].reason') ||
          get(processorResult, 'error.root_cause[0].type') ||
          get(processorResult, 'ignored_error.error.root_cause[0].reason') ||
          get(processorResult, 'ignored_error.error.root_cause[0].type');

        if (errorMessage) {
          processorError = {
            compile: false,
            message: errorMessage
          };
        }

        return {
          processorId: get(processorResult, 'tag'),
          output: get(processorResult, 'doc._source'),
          ingestMeta: {
            '_index': get(processorResult, 'doc._index'),
            '_id': get(processorResult, 'doc._id'),
            '_type': get(processorResult, 'doc._type'),
            '_routing': get(processorResult, 'doc._routing'),
            '_parent': get(processorResult, 'doc._parent'),
            '_timestamp': get(processorResult, 'doc._timestamp'),
            '_ttl': get(processorResult, 'doc._ttl'),
            '_ingest': get(processorResult, 'doc._ingest')
          },
          error: processorError
        };
      });

      return results;
    },
    esErrorToKibana: function (simulateEsDocument) {
      const processorId = get(simulateEsDocument, 'body.error.root_cause[0].header.processor_tag');
      if (!processorId) throw simulateEsDocument;

      const errorMessage = get(simulateEsDocument, 'body.error.root_cause[0].reason');
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
  };
}
