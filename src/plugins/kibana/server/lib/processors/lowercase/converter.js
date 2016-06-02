export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      lowercase: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'lowercase',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field
    };
  }
};
