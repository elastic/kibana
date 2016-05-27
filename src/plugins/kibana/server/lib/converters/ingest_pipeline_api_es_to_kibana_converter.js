import _ from 'lodash';
import * as esToKibanaProcessorConverters from '../processors/es_to_kibana_converters';

export default function ingestPipelineApiEsToKibanaConverter(pipelineEsDocument) {
  const esProcessors = _.get(pipelineEsDocument, 'config.processors');
  const result = {
    processors: _.map(esProcessors, (processor) => {
      const typeId = _.keys(processor)[0];
      return esToKibanaProcessorConverters[typeId](processor[typeId]);
    })
  };

  return result;
}
