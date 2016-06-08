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
    return {
      typeId: 'rename',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      target_field: processorEsDocument.target_field,
      ignore_failure: processorEsDocument.ignore_failure
    };
  }
};
