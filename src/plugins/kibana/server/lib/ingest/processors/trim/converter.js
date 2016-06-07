export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      trim: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'trim',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field
    };
  }
};
