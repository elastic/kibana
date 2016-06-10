import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    const types = {
      //<kibana type>: <ingest type>,
      auto: 'auto',
      number: 'float',
      string: 'string',
      boolean: 'boolean'
    };

    const processor = {
      convert: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        type: types[processorApiDocument.type]
      }
    };
    if (!_.isEmpty(processorApiDocument.target_field)) {
      processor.convert.target_field = processorApiDocument.target_field;
    }

    return processor;
  },
  esToKibana: function (processorEsDocument) {
    const types = {
      //<ingest type>: <kibana type>
      auto: 'auto',
      double: 'number',
      int: 'number',
      long: 'number',
      float: 'number',
      string: 'string',
      boolean: 'boolean'
    };

    return {
      typeId: 'convert',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      target_field: processorEsDocument.target_field,
      type: types[processorEsDocument.type]
    };
  }
};
