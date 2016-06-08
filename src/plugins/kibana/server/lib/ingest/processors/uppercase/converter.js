export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      uppercase: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'uppercase',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      ignore_failure: processorEsDocument.ignore_failure
    };
  }
};
