import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      trim: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'trim')) {
      throw new Error('Elasticsearch processor document missing [trim] property');
    }

    return {
      typeId: 'trim',
      processor_id: processorEsDocument.trim.tag,
      source_field: processorEsDocument.trim.field
    };
  }
};
