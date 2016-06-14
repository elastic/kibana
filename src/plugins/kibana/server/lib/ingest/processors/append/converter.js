import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      append: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.target_field,
        value: processorApiDocument.values
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'append')) {
      throw new Error('Elasticsearch processor document missing [append] property');
    }

    return {
      typeId: 'append',
      processor_id: processorEsDocument.append.tag,
      target_field: processorEsDocument.append.field,
      values: processorEsDocument.append.value
    };
  }
};
