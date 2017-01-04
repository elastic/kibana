import _ from 'lodash';
import processorArrayConverterProvider from '../processor_array/converter';

export default function (server) {
  const processorArrayConverter = processorArrayConverterProvider(server);

  return {
    kibanaToEs: function (pipelineApiDocument) {
      const result = {
        description: pipelineApiDocument.description,
        processors: processorArrayConverter.kibanaToEs(pipelineApiDocument.processors)
      };

      if (pipelineApiDocument.failure_action === 'on_error' &&
        pipelineApiDocument.failure_processors.length > 0) {
        result.on_failure = processorArrayConverter.kibanaToEs(pipelineApiDocument.failure_processors);
      }

      return result;
    },
    esToKibana: function (pipelineEsDocument) {
      const pipelineId = _.keys(pipelineEsDocument)[0];
      pipelineEsDocument = _.get(pipelineEsDocument, pipelineId);

      const result = {
        pipeline_id: pipelineId,
        description: pipelineEsDocument.description,
        processors: processorArrayConverter.esToKibana(pipelineEsDocument.processors)
      };

      if (pipelineEsDocument.on_failure) {
        result.failure_action = 'on_error';
        result.failure_processors = processorArrayConverter.esToKibana(pipelineEsDocument.on_failure);
      } else {
        result.failure_action = 'index_fail';
      }

      return result;
    }
  };
}
