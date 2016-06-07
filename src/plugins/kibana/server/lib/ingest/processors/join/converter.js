export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      join: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        separator: processorApiDocument.separator
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'join',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      separator: processorEsDocument.separator
    };
  }
};
