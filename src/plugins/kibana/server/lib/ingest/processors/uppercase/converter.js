import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      uppercase: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'uppercase')) {
      throw new Error('Elasticsearch processor document missing [uppercase] property');
    }

    return {
      typeId: 'uppercase',
      processor_id: processorEsDocument.uppercase.tag,
      source_field: processorEsDocument.uppercase.field,
      ignore_failure: processorEsDocument.uppercase.ignore_failure
    };
  }
};
