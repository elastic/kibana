export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      grok: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        pattern: processorApiDocument.pattern
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'grok',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      pattern: processorEsDocument.pattern
    };
  }
};
