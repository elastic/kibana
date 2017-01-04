import { set, get, has } from 'lodash';
import processorArrayConverterProvider from '../../processor_array/converter';

export default function (server) {
  const processorArrayConverter = processorArrayConverterProvider(server);

  return {
    kibanaToEs: function (processorApiDocument, typeId) {
      const subObject = {
        tag: processorApiDocument.processor_id
      };

      if (processorApiDocument.failure_action === 'ignore_error') {
        subObject.ignore_failure = true;
      }

      if (processorApiDocument.failure_action === 'on_error' && processorApiDocument.failure_processors.length > 0) {
        subObject.on_failure = processorArrayConverter.kibanaToEs(processorApiDocument.failure_processors);
      }

      const result = set({}, typeId, subObject);
      return result;
    },
    esToKibana: function (processorEsDocument, typeId) {
      if (!has(processorEsDocument, typeId)) {
        throw new Error(`Elasticsearch processor document missing [${typeId}] property`);
      }

      const subObject = get(processorEsDocument, typeId);

      const result = {
        type_id: typeId,
        processor_id: subObject.tag
      };

      result.failure_processors = processorArrayConverter.esToKibana(subObject.on_failure);

      if (subObject.on_failure) {
        result.failure_action = 'on_error';
      } else if (subObject.ignore_failure === true) {
        result.failure_action = 'ignore_error';
      } else {
        result.failure_action = 'index_fail';
      }

      return result;
    }
  };
}
