import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      lowercase: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'lowercase')) {
      throw new Error('Elasticsearch processor document missing [lowercase] property');
    }

    return {
      typeId: 'lowercase',
      processor_id: processorEsDocument.lowercase.tag,
      source_field: processorEsDocument.lowercase.field,
      ignore_failure: processorEsDocument.lowercase.ignore_failure
    };
  }
};
