import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      grok: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        patterns: [ processorApiDocument.pattern ]
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'grok')) {
      throw new Error('Elasticsearch processor document missing [grok] property');
    }

    let pattern = '';
    if (processorEsDocument.grok.patterns.length > 0) {
      pattern = processorEsDocument.grok.patterns[0];
    }

    return {
      typeId: 'grok',
      processor_id: processorEsDocument.grok.tag,
      source_field: processorEsDocument.grok.field,
      pattern: pattern
    };
  }
};
