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
        type: types[processorApiDocument.type],
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
    if (!_.isEmpty(processorApiDocument.target_field)) {
      processor.convert.target_field = processorApiDocument.target_field;
    }

    return processor;
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'convert')) {
      throw new Error('Elasticsearch processor document missing [convert] property');
    }

    const types = {
      //<ingest type>: <kibana type>
      auto: 'auto',
      double: 'number',
      float: 'number',
      integer: 'number',
      long: 'number',
      short: 'number',
      string: 'string',
      boolean: 'boolean'
    };

    return {
      typeId: 'convert',
      processor_id: processorEsDocument.convert.tag,
      source_field: processorEsDocument.convert.field,
      target_field: processorEsDocument.convert.target_field,
      type: types[processorEsDocument.convert.type],
      ignore_failure: processorEsDocument.convert.ignore_failure
    };
  }
};
