export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      remove: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'remove',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      ignore_failure: processorEsDocument.ignore_failure
    };
  }
};
