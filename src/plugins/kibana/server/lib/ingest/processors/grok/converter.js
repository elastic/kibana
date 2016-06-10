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
    let pattern = '';
    if (processorEsDocument.patterns.length > 0) {
      pattern = processorEsDocument.patterns[0];
    }

    return {
      typeId: 'grok',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      pattern: pattern
    };
  }
};
