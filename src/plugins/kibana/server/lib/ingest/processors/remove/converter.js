import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      remove: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'remove')) {
      throw new Error('Elasticsearch processor document missing [remove] property');
    }

    return {
      typeId: 'remove',
      processor_id: processorEsDocument.remove.tag,
      source_field: processorEsDocument.remove.field
    };
  }
};
