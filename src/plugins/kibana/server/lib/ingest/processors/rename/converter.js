import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      rename: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        target_field: processorApiDocument.target_field,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'rename')) {
      throw new Error('Elasticsearch processor document missing [rename] property');
    }

    return {
      typeId: 'rename',
      processor_id: processorEsDocument.rename.tag,
      source_field: processorEsDocument.rename.field,
      target_field: processorEsDocument.rename.target_field,
      ignore_failure: processorEsDocument.rename.ignore_failure
    };
  }
};
