import _ from 'lodash';
import * as ingestProcessorApiKibanaToEsConverters from '../processors/converters';

export default function ingestPipelineApiKibanaToEsConverter(pipelineApiDocument) {
  return {
    processors: _.map(pipelineApiDocument, (processor) => {
      return ingestProcessorApiKibanaToEsConverters[processor.type_id](processor);
    })
  };
}
