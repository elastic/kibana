import _ from 'lodash';
import ingestPipelineApiKibanaToEsConverter from './ingest_pipeline_api_kibana_to_es_converter';

export default function ingestSimulateApiKibanaToEsConverter(simulateApiDocument) {
  return {
    pipeline: ingestPipelineApiKibanaToEsConverter(simulateApiDocument.processors),
    docs: [
      {
        _source: simulateApiDocument.input
      }
    ]
  };
}
