import _ from 'lodash';
import * as processorConverters from '../processors/converters';

export default {
  kibanaToEs: function (pipelineApiDocument) {
    return {
      processors: _.map(pipelineApiDocument, (processor) => {
        const processorConverter = processorConverters[processor.type_id];
        return processorConverter.kibanaToEs(processor);
      })
    };
  },
  esToKibana: function (processorEsDocument) {
    throw new Error('Not yet implemented.');
  }
};
