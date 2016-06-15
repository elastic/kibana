import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      gsub: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        pattern: processorApiDocument.pattern,
        replacement: processorApiDocument.replacement,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'gsub')) {
      throw new Error('Elasticsearch processor document missing [gsub] property');
    }

    return {
      typeId: 'gsub',
      processor_id: processorEsDocument.gsub.tag,
      source_field: processorEsDocument.gsub.field,
      pattern: processorEsDocument.gsub.pattern,
      replacement: processorEsDocument.gsub.replacement,
      ignore_failure: processorEsDocument.gsub.ignore_failure
    };
  }
};
