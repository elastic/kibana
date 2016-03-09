import _ from 'lodash';
import * as ingestProcessorApiKibanaToEsConverters from './ingest_processor_api_kibana_to_es_converters';

export default function ingestSimulateApiKibanaToEsConverter(simulateApiDocument) {
  return {
    pipeline: {
      processors: _.map(simulateApiDocument.processors, (processor) => {
        return ingestProcessorApiKibanaToEsConverters[processor.type_id](processor);
      })
    },
    docs: [
      {
        _source: simulateApiDocument.input
      }
    ]
  };
}
