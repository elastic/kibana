export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      uppercase: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'uppercase',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field
    };
  }
};
