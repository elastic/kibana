import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      set: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.target_field,
        value: processorApiDocument.value,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'set')) {
      throw new Error('Elasticsearch processor document missing [set] property');
    }

    return {
      typeId: 'set',
      processor_id: processorEsDocument.set.tag,
      target_field: processorEsDocument.set.field,
      value: processorEsDocument.set.value,
      ignore_failure: processorEsDocument.set.ignore_failure
    };
  }
};
