export default {
  kibanaToEs: function (processorApiDocument) {
    return {
      split: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        separator: processorApiDocument.separator
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'split',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      separator: processorEsDocument.separator
    };
  }
};
