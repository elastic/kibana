import _ from 'lodash';
import * as ingestProcessorApiToEsConverters from './ingest_processor_api_to_es_converters';

export default function ingestSimulateApiToEsConverter(simulateApiDocument) {
  return {
    pipeline: {
      processors: _.map(simulateApiDocument.processors, (processor) => {
        return ingestProcessorApiToEsConverters[processor.type_id](processor);
      })
    },
    docs: [
      {
        _source: simulateApiDocument.input
      }
    ]
  };
}
