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
    return {
      typeId: 'gsub',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      pattern: processorEsDocument.pattern,
      replacement: processorEsDocument.replacement,
      ignore_failure: processorEsDocument.ignore_failure
    };
  }
};
