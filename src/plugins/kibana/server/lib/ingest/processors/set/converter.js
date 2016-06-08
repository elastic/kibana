export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      set: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.target_field,
        value: processorApiDocument.value,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'set',
      processor_id: processorEsDocument.tag,
      target_field: processorEsDocument.field,
      value: processorEsDocument.value,
      ignore_failure: processorEsDocument.ignore_failure
    };
  }
};
